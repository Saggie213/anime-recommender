import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import animeRouter from './routes/anime';
import recommendationRouter from './routes/recommendation';
import analyticsRouter from './routes/analytics';
import seedRouter, { autoSeedIfEmpty } from './routes/seed';

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
app.use('/api/seed', seedRouter);

// Base landing route to handle the root URL "/"
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Welcome to the Anime Recommendation System Backend API Gateway!',
    endpoints: {
      auth: '/api/auth',
      anime: '/api/anime',
      recommendations: '/api/recommendations',
      analytics: '/api/analytics',
      health: '/health'
    }
  });
});

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
  
  // Auto-seed database if empty (runs in background, doesn't block server)
  autoSeedIfEmpty().catch(err => {
    console.error('[Startup] Auto-seed error (non-fatal):', err);
  });
});