import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// GET /api/analytics - Aggregate user watchlist analytics
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;

    // Fetch user list with anime metadata
    const userList = await prisma.userAnimeList.findMany({
      where: { userId },
      include: { anime: true }
    });

    if (userList.length === 0) {
      return res.json({
        totalCount: 0,
        completedCount: 0,
        watchingCount: 0,
        planToWatchCount: 0,
        droppedCount: 0,
        totalEpisodes: 0,
        averageRating: 0,
        genreDistribution: [],
        ratingDistribution: [],
        statusDistribution: []
      });
    }

    // 1. Core aggregates
    const totalCount = userList.length;
    let completedCount = 0;
    let watchingCount = 0;
    let planToWatchCount = 0;
    let droppedCount = 0;
    let totalEpisodes = 0;
    let sumRating = 0;
    let ratedCount = 0;

    // Genre frequencies
    const genreMap: Record<string, number> = {};
    // Rating frequencies (1-10)
    const ratingMap: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0
    };

    for (const item of userList) {
      // Status aggregation
      if (item.status === 'COMPLETED') completedCount++;
      else if (item.status === 'WATCHING') watchingCount++;
      else if (item.status === 'PLAN_TO_WATCH') planToWatchCount++;
      else if (item.status === 'DROPPED') droppedCount++;

      // Episodes count
      if (item.status === 'COMPLETED') {
        totalEpisodes += item.anime.episodes;
      } else {
        totalEpisodes += item.watchedEpisodes;
      }

      // Ratings aggregation
      if (item.rating !== null) {
        sumRating += item.rating;
        ratedCount++;
        ratingMap[item.rating] = (ratingMap[item.rating] || 0) + 1;
      }

      // Genres distribution (only count for items users actually watch/watched)
      if (item.status === 'COMPLETED' || item.status === 'WATCHING') {
        const genres = item.anime.genres.split(',').map(g => g.trim()).filter(Boolean);
        for (const g of genres) {
          genreMap[g] = (genreMap[g] || 0) + 1;
        }
      }
    }

    // Format distributions for Recharts
    const genreDistribution = Object.entries(genreMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // top 8 genres

    const ratingDistribution = Object.entries(ratingMap).map(([rating, count]) => ({
      rating: parseInt(rating),
      count
    }));

    const statusDistribution = [
      { name: 'Watching', value: watchingCount, color: '#3b82f6' }, // Blue
      { name: 'Completed', value: completedCount, color: '#10b981' }, // Green
      { name: 'Plan to Watch', value: planToWatchCount, color: '#f59e0b' }, // Amber
      { name: 'Dropped', value: droppedCount, color: '#ef4444' } // Red
    ].filter(s => s.value > 0);

    const averageRating = ratedCount > 0 ? parseFloat((sumRating / ratedCount).toFixed(2)) : 0;

    return res.json({
      totalCount,
      completedCount,
      watchingCount,
      planToWatchCount,
      droppedCount,
      totalEpisodes,
      averageRating,
      genreDistribution,
      ratingDistribution,
      statusDistribution
    });
  } catch (error) {
    console.error('Analytics aggregation error:', error);
    return res.status(500).json({ error: 'Failed to compile profile analytics' });
  }
});

export default router;
