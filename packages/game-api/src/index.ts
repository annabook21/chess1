/**
 * Game API Entry Point
 */

import express from 'express';
import gameRoutes from './routes/game';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS (for frontend)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'game-api' });
});

// Game routes
app.use('/game', gameRoutes);

app.listen(PORT, () => {
  console.log(`Game API running on port ${PORT}`);
});

