import { Router, Response } from 'express';
import axios from 'axios';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// HELPER: Simple fallback recommendations if ML service is down
const getLocalFallbackRecommendations = async (userId: number, limit = 10) => {
  // Fetch user favorite genres
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const favGenres = user?.favoriteGenres.split(',').filter(Boolean) || [];
  
  // Find anime already in user's list to exclude
  const watched = await prisma.userAnimeList.findMany({ where: { userId } });
  const excludedIds = watched.map(w => w.animeId);

  let fallbackAnime: any[] = [];
  if (favGenres.length > 0) {
    // Find anime containing favorite genres, sorting by score
    fallbackAnime = await prisma.anime.findMany({
      where: {
        id: { notIn: excludedIds },
        OR: favGenres.map(g => ({ genres: { contains: g } }))
      },
      orderBy: { score: 'desc' },
      take: limit
    });
  }

  // If not enough recommendations, fill with top rated popular anime
  if (fallbackAnime.length < limit) {
    const filler = await prisma.anime.findMany({
      where: {
        id: { notIn: [...excludedIds, ...fallbackAnime.map(a => a.id)] }
      },
      orderBy: { score: 'desc' },
      take: limit - fallbackAnime.length
    });
    fallbackAnime.push(...filler);
  }

  return fallbackAnime.map(anime => ({
    ...anime,
    final_score: 0.8,
    is_fallback: true
  }));
};

// GET /api/recommendations/personal - Hybrid Personal Recs
router.get('/personal', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Fetch user's rating list
    const userRatings = await prisma.userAnimeList.findMany({
      where: { userId: req.user.id }
    });

    const userHistory = userRatings.map(r => ({
      anime_id: r.animeId,
      rating: r.rating
    }));

    try {
      const response = await axios.post(`${ML_SERVICE_URL}/recommend/hybrid`, {
        user_id: req.user.id,
        user_history: userHistory,
        top_n: 12
      }, { timeout: 4000 }); // 4s timeout

      return res.json(response.data.recommendations);
    } catch (mlError) {
      console.warn('ML Service offline or timed out. Serving database fallback recommendations.');
      const localRecs = await getLocalFallbackRecommendations(req.user.id, 12);
      return res.json(localRecs);
    }
  } catch (error) {
    console.error('Fetch personal recommendations error:', error);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// GET /api/recommendations/similar/:animeId - Get similar anime
router.get('/similar/:animeId', async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId);
    if (isNaN(animeId)) return res.status(400).json({ error: 'Invalid anime ID' });

    try {
      const response = await axios.get(`${ML_SERVICE_URL}/recommend/similar`, {
        params: { anime_id: animeId, top_n: 6 },
        timeout: 3000
      });
      return res.json(response.data.similar);
    } catch (mlError) {
      // Offline fallback: find anime sharing the same genres in the local database
      const anime = await prisma.anime.findUnique({ where: { id: animeId } });
      if (!anime) return res.json([]);

      const genres = anime.genres.split(',').map(g => g.trim()).filter(Boolean);
      
      const fallbackSimilar = await prisma.anime.findMany({
        where: {
          id: { not: animeId },
          OR: genres.slice(0, 2).map(g => ({ genres: { contains: g } }))
        },
        orderBy: { score: 'desc' },
        take: 6
      });
      
      return res.json(fallbackSimilar.map(a => ({ ...a, similarity_score: 0.5 })));
    }
  } catch (error) {
    console.error('Fetch similar anime error:', error);
    return res.status(500).json({ error: 'Failed to retrieve similar titles' });
  }
});

// GET /api/recommendations/explain/:animeId - Explain recommendation
router.get('/explain/:animeId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const animeId = parseInt(req.params.animeId);
    if (isNaN(animeId)) return res.status(400).json({ error: 'Invalid anime ID' });

    try {
      const response = await axios.get(`${ML_SERVICE_URL}/explain/${animeId}`, {
        params: { user_id: req.user.id },
        timeout: 3000
      });
      return res.json(response.data);
    } catch (mlError) {
      // Offline explanation generator
      const anime = await prisma.anime.findUnique({ where: { id: animeId } });
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      
      if (!anime || !user) return res.json({ explanation: 'Recommended based on overall score.' });

      const favs = user.favoriteGenres.split(',').filter(Boolean);
      const matched = anime.genres.split(',').map(g => g.trim()).filter(g => favs.includes(g));

      if (matched.length > 0) {
        return res.json({
          explanation: `Recommended because it aligns with your favorite genre: ${matched[0]}.`
        });
      }

      return res.json({
        explanation: `Recommended because this title is currently highly popular in the catalog.`
      });
    }
  } catch (error) {
    console.error('Recommendation explanation error:', error);
    return res.status(500).json({ error: 'Failed to explain recommendation' });
  }
});

// POST /api/recommendations/chat - Chatbot assistant proxy
router.post('/chat', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: 'Message content is required' });

    // Fetch user's rating list to pass history to LLM/NLP chatbot
    const userRatings = await prisma.userAnimeList.findMany({
      where: { userId: req.user.id }
    });

    const userHistory = userRatings.map(r => ({
      anime_id: r.animeId,
      rating: r.rating
    }));

    try {
      const response = await axios.post(`${ML_SERVICE_URL}/chat`, {
        message,
        user_id: req.user.id,
        user_history: userHistory
      }, { timeout: 10000 }); // Chat has a longer timeout (10s) in case it uses LLM API

      return res.json(response.data);
    } catch (mlError) {
      // Basic local Express chatbot fallback if ML service is fully offline
      const reply = `Hi! I'm currently operating in offline mode. Let me know if you would like me to list high rated Action or Romance series, or type the name of an anime to find similar ones.`;
      return res.json({
        reply,
        anime_list: []
      });
    }
  } catch (error) {
    console.error('Chat routing error:', error);
    return res.status(500).json({ error: 'Failed to compile chatbot response' });
  }
});

// POST /api/recommendations/search - Semantic NLP Search
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Search query is required' });

    try {
      const response = await axios.post(`${ML_SERVICE_URL}/search/semantic`, {
        query,
        top_n: 12
      }, { timeout: 5000 });
      return res.json(response.data.results);
    } catch (mlError) {
      // Fallback: SQL search in title/genres/synopsis
      const fallbackSearch = await prisma.anime.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { genres: { contains: query } },
            { synopsis: { contains: query } }
          ]
        },
        orderBy: { score: 'desc' },
        take: 12
      });
      return res.json(fallbackSearch.map(a => ({ ...a, match_score: 0.7, is_fallback: true })));
    }
  } catch (error) {
    console.error('Semantic search routing error:', error);
    return res.status(500).json({ error: 'Failed to execute semantic search' });
  }
});

export default router;
