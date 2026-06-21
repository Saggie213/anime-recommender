import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import animeRouter from './routes/anime';
import recommendationRouter from './routes/recommendation';
import analyticsRouter from './routes/analytics';

// Load environment config
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Setup middlewares
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/anime', animeRouter);
app.use('/api/recommendations', recommendationRouter);
app.use('/api/analytics', analyticsRouter);

// Base health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`[Express] Core Backend Server is running on port ${PORT}`);
});
