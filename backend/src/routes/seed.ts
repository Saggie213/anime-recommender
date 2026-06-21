import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../db';

const router = Router();

// Simple CSV parser helper
const parseCsv = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const [userId, animeId, rating] = lines[i].split(',');
    data.push({
      userId: parseInt(userId),
      animeId: parseInt(animeId),
      rating: parseInt(rating)
    });
  }
  return data;
};

// Try multiple possible data directory paths (handles local dev, compiled dist, Railway)
const findDataDir = (): string | null => {
  const candidates = [
    path.join(__dirname, '..', '..', 'data'),       // from src/: backend/data (won't exist)
    path.join(__dirname, '..', '..', '..', 'data'),  // from dist/: repo_root/data
    path.join(process.cwd(), 'data'),                // from backend cwd
    path.join(process.cwd(), '..', 'data'),          // from backend cwd up to repo root
  ];

  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (fs.existsSync(path.join(resolved, 'anime_seed.json'))) {
      return resolved;
    }
  }
  return null;
};

// POST /api/seed - Seed the database with anime data
router.post('/', async (req, res) => {
  try {
    // Check if DB already has anime data
    const existingCount = await prisma.anime.count();
    if (existingCount > 0) {
      return res.json({
        status: 'skipped',
        message: `Database already has ${existingCount} anime entries. Use ?force=true to reseed.`,
        animeCount: existingCount
      });
    }

    const dataDir = findDataDir();
    if (!dataDir) {
      return res.status(404).json({
        error: 'Data directory not found',
        hint: 'Ensure data/anime_seed.json exists relative to the backend'
      });
    }

    const animeSeedPath = path.join(dataDir, 'anime_seed.json');
    const ratingsSeedPath = path.join(dataDir, 'mock_ratings.csv');

    // 1. Seed Anime
    console.log('[Seeder] Seeding Anime records...');
    const animeData = JSON.parse(fs.readFileSync(animeSeedPath, 'utf-8'));
    
    let animeCount = 0;
    for (const anime of animeData) {
      await prisma.anime.upsert({
        where: { id: anime.id },
        update: {},
        create: {
          id: anime.id,
          title: anime.title,
          synopsis: anime.synopsis,
          genres: anime.genres,
          studio: anime.studio,
          releaseYear: anime.releaseYear,
          episodes: anime.episodes,
          rating: anime.rating,
          score: anime.score,
          popularity: anime.popularity,
          imageUrl: anime.imageUrl,
          status: anime.status
        }
      });
      animeCount++;
    }
    console.log(`[Seeder] Seeded ${animeCount} anime entries.`);

    // 2. Seed Mock Users
    console.log('[Seeder] Seeding mock user accounts...');
    const mockPasswordHash = '$2a$10$f/LhM7T.z5.aD.L2Bv5cEe40.k7KqJ49YV.g7.F942fHqF16yI5k.';
    const genreChoices = ['Action', 'Comedy', 'Sci-Fi', 'Romance', 'Fantasy', 'Thriller', 'Slice of Life'];

    for (let uId = 1; uId <= 100; uId++) {
      const username = `otaku_user${uId}`;
      const email = `user${uId}@animerecs.com`;
      const randGenres = [
        genreChoices[Math.floor(Math.random() * genreChoices.length)],
        genreChoices[Math.floor(Math.random() * genreChoices.length)]
      ].filter((v, i, a) => a.indexOf(v) === i);

      await prisma.user.upsert({
        where: { id: uId },
        update: {},
        create: {
          id: uId,
          username,
          email,
          passwordHash: mockPasswordHash,
          favoriteGenres: randGenres.join(',')
        }
      });
    }
    console.log('[Seeder] Created 100 mock user accounts.');

    // 3. Seed Ratings (if CSV exists)
    let ratingsCount = 0;
    if (fs.existsSync(ratingsSeedPath)) {
      console.log('[Seeder] Seeding user ratings...');
      const ratingEntries = parseCsv(ratingsSeedPath);
      
      const chunkSize = 200;
      for (let i = 0; i < ratingEntries.length; i += chunkSize) {
        const chunk = ratingEntries.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (entry) => {
            try {
              await prisma.userAnimeList.upsert({
                where: {
                  userId_animeId: {
                    userId: entry.userId,
                    animeId: entry.animeId
                  }
                },
                update: {
                  rating: entry.rating,
                  status: 'COMPLETED'
                },
                create: {
                  userId: entry.userId,
                  animeId: entry.animeId,
                  status: 'COMPLETED',
                  rating: entry.rating
                }
              });
              ratingsCount++;
            } catch {
              // Ignore constraint failures
            }
          })
        );
      }
      console.log(`[Seeder] Seeded ${ratingsCount} ratings.`);
    }

    return res.json({
      status: 'success',
      message: 'Database seeded successfully!',
      animeCount,
      usersCreated: 100,
      ratingsCount
    });

  } catch (error: any) {
    console.error('[Seeder] Error:', error);
    return res.status(500).json({ error: 'Seeding failed', detail: error.message });
  }
});

// Auto-seed function (called at startup)
export const autoSeedIfEmpty = async () => {
  try {
    const count = await prisma.anime.count();
    if (count > 0) {
      console.log(`[AutoSeed] Database already has ${count} anime entries. Skipping seed.`);
      return;
    }

    console.log('[AutoSeed] Database is empty. Running auto-seed...');
    const dataDir = findDataDir();
    if (!dataDir) {
      console.log('[AutoSeed] Data directory not found. Skipping auto-seed.');
      console.log('[AutoSeed] You can manually seed via POST /api/seed');
      return;
    }

    const animeSeedPath = path.join(dataDir, 'anime_seed.json');
    const animeData = JSON.parse(fs.readFileSync(animeSeedPath, 'utf-8'));

    let count2 = 0;
    for (const anime of animeData) {
      await prisma.anime.upsert({
        where: { id: anime.id },
        update: {},
        create: {
          id: anime.id,
          title: anime.title,
          synopsis: anime.synopsis,
          genres: anime.genres,
          studio: anime.studio,
          releaseYear: anime.releaseYear,
          episodes: anime.episodes,
          rating: anime.rating,
          score: anime.score,
          popularity: anime.popularity,
          imageUrl: anime.imageUrl,
          status: anime.status
        }
      });
      count2++;
    }
    console.log(`[AutoSeed] Successfully seeded ${count2} anime entries.`);

    // Seed mock users
    const mockPasswordHash = '$2a$10$f/LhM7T.z5.aD.L2Bv5cEe40.k7KqJ49YV.g7.F942fHqF16yI5k.';
    const genreChoices = ['Action', 'Comedy', 'Sci-Fi', 'Romance', 'Fantasy', 'Thriller', 'Slice of Life'];
    for (let uId = 1; uId <= 100; uId++) {
      const randGenres = [
        genreChoices[Math.floor(Math.random() * genreChoices.length)],
        genreChoices[Math.floor(Math.random() * genreChoices.length)]
      ].filter((v, i, a) => a.indexOf(v) === i);
      await prisma.user.upsert({
        where: { id: uId },
        update: {},
        create: {
          id: uId,
          username: `otaku_user${uId}`,
          email: `user${uId}@animerecs.com`,
          passwordHash: mockPasswordHash,
          favoriteGenres: randGenres.join(',')
        }
      });
    }
    console.log('[AutoSeed] Created 100 mock users.');

    // Seed ratings
    const ratingsSeedPath = path.join(dataDir, 'mock_ratings.csv');
    if (fs.existsSync(ratingsSeedPath)) {
      const ratingEntries = parseCsv(ratingsSeedPath);
      const chunkSize = 200;
      for (let i = 0; i < ratingEntries.length; i += chunkSize) {
        const chunk = ratingEntries.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (entry) => {
            try {
              await prisma.userAnimeList.upsert({
                where: { userId_animeId: { userId: entry.userId, animeId: entry.animeId } },
                update: { rating: entry.rating, status: 'COMPLETED' },
                create: { userId: entry.userId, animeId: entry.animeId, status: 'COMPLETED', rating: entry.rating }
              });
            } catch { /* ignore */ }
          })
        );
      }
      console.log(`[AutoSeed] Seeded ${ratingEntries.length} ratings.`);
    }

  } catch (error) {
    console.error('[AutoSeed] Error during auto-seed:', error);
    console.log('[AutoSeed] The app will continue running. Seed manually via POST /api/seed');
  }
};

export default router;
