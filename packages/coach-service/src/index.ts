/**
 * Coach Service Entry Point
 */

import express from 'express';
import cors from 'cors';
import coachRoutes from './routes/coach';
import { BedrockClient } from './clients/bedrock-client';

const app = express();
const PORT = process.env.PORT || 3003;

// Configure CORS
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Body parser with size limit
app.use(express.json({
  limit: '10kb', // Reasonable for chess API
  strict: true,  // Reject non-objects/arrays
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log request
  console.log('[COACH]', req.method, req.path, {
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 50),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log('[COACH]', req.method, req.path, res.statusCode, `${duration}ms`);
  });

  next();
});

// Health check with optional deep check
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'coach-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  // Optional deep check (query param: ?deep=true)
  if (req.query.deep === 'true') {
    try {
      // Quick test of Bedrock connectivity (with timeout)
      const bedrockClient = new BedrockClient();
      const testPromise = bedrockClient.generateText('Test', { timeout: 2000 }).then(() => true);
      const timeoutPromise = new Promise<boolean>(resolve =>
        setTimeout(() => resolve(false), 2000)
      );

      const bedrockOk = await Promise.race([testPromise, timeoutPromise]);

      if (!bedrockOk) {
        return res.status(503).json({
          ...health,
          status: 'degraded',
          checks: { bedrock: 'timeout' },
        });
      }

      return res.json({
        ...health,
        checks: { bedrock: 'ok' },
      });
    } catch (error: any) {
      return res.status(503).json({
        ...health,
        status: 'unhealthy',
        checks: { bedrock: error.message },
      });
    }
  }

  res.json(health);
});

// Coach routes
app.use('/coach', coachRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[COACH] Unhandled error:', err);

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    error: message,
    requestId: req.headers['x-request-id'] || 'unknown',
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Coach service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[COACH] SIGTERM received, shutting down gracefully...');

  server.close(() => {
    console.log('[COACH] Server closed, exiting');
    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    console.error('[COACH] Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  console.log('[COACH] SIGINT received, shutting down...');
  process.exit(0);
});
