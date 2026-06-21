import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'anime_recommender_secure_secret_key_12345!';

// Utility to optionally verify user from token without throwing 401
const getOptionalUser = (req: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; username: string; email: string };
  } catch {
    return null;
  }
};

// GET /api/anime - Browse with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const genre = req.query.genre as string;
    const sortBy = req.query.sortBy as string || 'score'; // score, popularity, title

    // Build filter conditions
    const whereClause: any = {};

    if (search) {
      whereClause.title = { contains: search };
    }

    if (genre) {
      whereClause.genres = { contains: genre };
    }

    // Build sorting rules
    let orderBy: any = {};
    if (sortBy === 'score') {
      orderBy = { score: 'desc' };
    } else if (sortBy === 'popularity') {
      orderBy = { popularity: 'asc' }; // Lower popularity rank means more popular
    } else if (sortBy === 'title') {
      orderBy = { title: 'asc' };
    } else {
      orderBy = { score: 'desc' };
    }

    // Query database
    const [animeList, totalCount] = await prisma.$transaction([
      prisma.anime.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit
      }),
      prisma.anime.count({ where: whereClause })
    ]);

    return res.json({
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      data: animeList
    });
  } catch (error) {
    console.error('Fetch anime error:', error);
    return res.status(500).json({ error: 'Failed to retrieve anime' });
  }
});

// GET /api/anime/trending - Trending / Top Rated lists
router.get('/trending', async (req, res) => {
  try {
    const trendingToday = await prisma.anime.findMany({
      orderBy: { popularity: 'asc' },
      take: 10
    });

    const highestRated = await prisma.anime.findMany({
      orderBy: { score: 'desc' },
      take: 10
    });

    return res.json({
      trending: trendingToday,
      highestRated
    });
  } catch (error) {
    console.error('Fetch trending anime error:', error);
    return res.status(500).json({ error: 'Failed to retrieve trending lists' });
  }
});

// GET /api/anime/watchlist - Retrieve current user's watchlist
router.get('/watchlist', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const watchlist = await prisma.userAnimeList.findMany({
      where: { userId: req.user.id },
      include: {
        anime: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json(watchlist);
  } catch (error) {
    console.error('Fetch watchlist error:', error);
    return res.status(500).json({ error: 'Failed to retrieve watchlist' });
  }
});

// GET /api/anime/:id - Get specific anime details
router.get('/:id', async (req, res) => {
  try {
    const animeId = parseInt(req.params.id);
    if (isNaN(animeId)) {
      return res.status(400).json({ error: 'Invalid anime ID' });
    }

    const anime = await prisma.anime.findUnique({
      where: { id: animeId }
    });

    if (!anime) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    // Check if the current request is from an authenticated user and fetch user's status/rating
    let userRelation = null;
    const optionalUser = getOptionalUser(req);
    if (optionalUser) {
      userRelation = await prisma.userAnimeList.findUnique({
        where: {
          userId_animeId: {
            userId: optionalUser.id,
            animeId: animeId
          }
        }
      });
    }

    return res.json({
      ...anime,
      userStatus: userRelation ? userRelation.status : null,
      userRating: userRelation ? userRelation.rating : null,
      userWatchedEpisodes: userRelation ? userRelation.watchedEpisodes : 0
    });
  } catch (error) {
    console.error('Fetch anime details error:', error);
    return res.status(500).json({ error: 'Failed to retrieve anime details' });
  }
});

// POST /api/anime/watchlist - Update/Add item to user watchlist
router.post('/watchlist', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { animeId, status, rating, watchedEpisodes } = req.body;

    if (!animeId || !status) {
      return res.status(400).json({ error: 'Anime ID and status are required' });
    }

    // Verify anime exists in database
    const animeExists = await prisma.anime.findUnique({
      where: { id: parseInt(animeId) }
    });

    if (!animeExists) {
      return res.status(404).json({ error: 'Anime not found in database catalog' });
    }

    // Upsert watchlist status
    const updatedItem = await prisma.userAnimeList.upsert({
      where: {
        userId_animeId: {
          userId: req.user.id,
          animeId: parseInt(animeId)
        }
      },
      update: {
        status,
        rating: rating !== undefined ? parseInt(rating) : undefined,
        watchedEpisodes: watchedEpisodes !== undefined ? parseInt(watchedEpisodes) : undefined
      },
      create: {
        userId: req.user.id,
        animeId: parseInt(animeId),
        status,
        rating: rating !== undefined ? parseInt(rating) : null,
        watchedEpisodes: watchedEpisodes !== undefined ? parseInt(watchedEpisodes) : 0
      }
    });

    // Notify ML Service that rating is updated so that we can trigger a model retrain asynchronously
    // Express doesn't wait for ML retraining to finish to send success response
    // We import axios and make request in the background
    try {
      const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      axios.post(`${ML_URL}/train`).catch((err: any) => {
        console.log('Asynchronous SVD model retrain notice sent. (ML service is offline or loading).');
      });
    } catch (err) {
      // Ignore
    }

    return res.json({
      message: 'Watchlist successfully updated',
      data: updatedItem
    });
  } catch (error) {
    console.error('Update watchlist error:', error);
    return res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

export default router;
