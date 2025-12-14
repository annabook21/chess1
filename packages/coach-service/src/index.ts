/**
 * Coach Service Entry Point
 */

import express from 'express';
import coachRoutes from './routes/coach';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'coach-service' });
});

// Coach routes
app.use('/coach', coachRoutes);

app.listen(PORT, () => {
  console.log(`Coach service running on port ${PORT}`);
});

