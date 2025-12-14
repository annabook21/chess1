/**
 * Engine Service Entry Point
 * 
 * Runs Stockfish wrapper as HTTP service
 */

import express from 'express';
import engineRoutes from './routes/engine';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'engine-service' });
});

// Engine routes
app.use('/engine', engineRoutes);

app.listen(PORT, () => {
  console.log(`Engine service running on port ${PORT}`);
});

