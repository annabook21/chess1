import express from 'express';
import { styleRoutes } from './routes/style';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (_, res) => {
  res.json({ status: 'healthy', service: 'style-service' });
});

app.use('/style', styleRoutes);

app.listen(PORT, () => {
  console.log(`Style service running on port ${PORT}`);
});







