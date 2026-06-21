import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../db';
import { fetchTopAnimeFromJikan, fetchCurrentlyAiring, type ParsedAnime } from '../services/jikan';

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

// Try multiple possible data directory paths
const findDataDir = (): string | null => {
  const candidates = [
    path.join(__dirname, '..', '..', 'data'),
    path.join(__dirname, '..', '..', '..', 'data'),
    path.join(process.cwd(), 'data'),
    path.join(process.cwd(), '..', 'data'),
  ];

  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (fs.existsSync(path.join(resolved, 'anime_seed.json'))) {
      return resolved;
    }
  }
  return null;
};

// Upsert a batch of parsed anime entries into the database
async function upsertAnimeEntries(animeList: ParsedAnime[]): Promise<number> {
  let count = 0;
  for (const anime of animeList) {
    await prisma.anime.upsert({
      where: { id: anime.id },
      update: {
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
        status: anime.status,
      },
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
        status: anime.status,
      }
    });
    count++;
  }
  return count;
}

// Seed mock users and ratings from CSV
async function seedMockUsersAndRatings(dataDir: string | null) {
  // Seed mock users
  console.log('[Seeder] Seeding mock user accounts...');
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
  console.log('[Seeder] Created 100 mock user accounts.');

  // Seed ratings from CSV if available
  if (dataDir) {
    const ratingsSeedPath = path.join(dataDir, 'mock_ratings.csv');
    if (fs.existsSync(ratingsSeedPath)) {
      console.log('[Seeder] Seeding user ratings from CSV...');
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
            } catch { /* ignore constraint failures */ }
          })
        );
      }
      console.log(`[Seeder] Seeded ${ratingEntries.length} ratings.`);
    }
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /api/seed - Seed from static file OR Jikan API (auto-detects)
router.post('/', async (req, res) => {
  try {
    const existingCount = await prisma.anime.count();
    const force = req.query.force === 'true';

    if (existingCount > 0 && !force) {
      return res.json({
        status: 'skipped',
        message: `Database already has ${existingCount} anime entries. Add ?force=true to reseed.`,
        animeCount: existingCount
      });
    }

    // Try static file first, fall back to Jikan API
    const dataDir = findDataDir();
    let animeCount = 0;

    if (dataDir) {
      console.log('[Seeder] Using static seed file...');
      const animeSeedPath = path.join(dataDir, 'anime_seed.json');
      const animeData: ParsedAnime[] = JSON.parse(fs.readFileSync(animeSeedPath, 'utf-8'));
      animeCount = await upsertAnimeEntries(animeData);
    } else {
      console.log('[Seeder] No static seed file found. Fetching from Jikan API...');
      const animeData = await fetchTopAnimeFromJikan(10); // 250 anime
      animeCount = await upsertAnimeEntries(animeData);
    }

    // Seed mock users and ratings
    await seedMockUsersAndRatings(dataDir);

    return res.json({
      status: 'success',
      source: dataDir ? 'static_file' : 'jikan_api',
      animeCount,
      usersCreated: 100
    });

  } catch (error: any) {
    console.error('[Seeder] Error:', error);
    return res.status(500).json({ error: 'Seeding failed', detail: error.message });
  }
});

// POST /api/seed/refresh - Fetch latest anime from Jikan API and update DB
router.post('/refresh', async (req, res) => {
  try {
    const pages = Math.min(parseInt(req.query.pages as string) || 10, 20); // max 20 pages = 500 anime

    console.log(`[Refresh] Fetching ${pages} pages of top anime from Jikan API...`);
    const topAnime = await fetchTopAnimeFromJikan(pages);

    console.log(`[Refresh] Fetching currently airing anime...`);
    const airingAnime = await fetchCurrentlyAiring(2);

    // Merge, deduplicating by ID (top anime takes priority)
    const seenIds = new Set<number>();
    const allAnime: ParsedAnime[] = [];

    for (const a of topAnime) {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAnime.push(a);
      }
    }
    for (const a of airingAnime) {
      if (!seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAnime.push(a);
      }
    }

    console.log(`[Refresh] Upserting ${allAnime.length} anime entries...`);
    const count = await upsertAnimeEntries(allAnime);

    return res.json({
      status: 'success',
      source: 'jikan_api_live',
      totalFetched: allAnime.length,
      upsertedCount: count,
      topAnimeCount: topAnime.length,
      airingAnimeCount: airingAnime.length,
      message: `Catalog refreshed with ${count} anime from Jikan API (top rated + currently airing).`
    });

  } catch (error: any) {
    console.error('[Refresh] Error:', error);
    return res.status(500).json({ error: 'Refresh failed', detail: error.message });
  }
});

// GET /api/seed/status - Check catalog status
router.get('/status', async (req, res) => {
  try {
    const animeCount = await prisma.anime.count();
    const userCount = await prisma.user.count();
    const ratingCount = await prisma.userAnimeList.count();
    const hasStaticFile = findDataDir() !== null;

    return res.json({
      animeCount,
      userCount,
      ratingCount,
      hasStaticSeedFile: hasStaticFile,
      source: animeCount > 0 ? 'seeded' : 'empty',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── Auto-Seed Function (called at startup) ─────────────────────────────────

export const autoSeedIfEmpty = async () => {
  try {
    const count = await prisma.anime.count();
    if (count > 0) {
      console.log(`[AutoSeed] Database already has ${count} anime entries. Skipping.`);
      return;
    }

    console.log('[AutoSeed] Database is empty. Starting auto-seed...');

    // Try static file first
    const dataDir = findDataDir();
    if (dataDir) {
      console.log('[AutoSeed] Found static seed file. Loading...');
      const animeSeedPath = path.join(dataDir, 'anime_seed.json');
      const animeData: ParsedAnime[] = JSON.parse(fs.readFileSync(animeSeedPath, 'utf-8'));
      const seeded = await upsertAnimeEntries(animeData);
      console.log(`[AutoSeed] Seeded ${seeded} anime from static file.`);
    } else {
      // No static file — fetch live from Jikan API
      console.log('[AutoSeed] No static seed file. Fetching live from Jikan API...');
      const animeData = await fetchTopAnimeFromJikan(10); // 250 anime (~15 seconds)
      if (animeData.length > 0) {
        const seeded = await upsertAnimeEntries(animeData);
        console.log(`[AutoSeed] Seeded ${seeded} anime from Jikan API.`);
      } else {
        console.warn('[AutoSeed] Jikan API returned no data. Database remains empty.');
        console.log('[AutoSeed] You can manually seed via POST /api/seed/refresh');
        return;
      }
    }

    // Seed mock users and ratings
    await seedMockUsersAndRatings(dataDir);
    console.log('[AutoSeed] Auto-seed complete!');

  } catch (error) {
    console.error('[AutoSeed] Error during auto-seed:', error);
    console.log('[AutoSeed] App continues running. Seed manually via POST /api/seed/refresh');
  }
};

export default router;
