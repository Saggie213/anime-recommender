import fs from 'fs';
import path from 'path';
import prisma from './db';

// Simple CSV parser helper
const parseCsv = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Skip header
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

const seedDatabase = async () => {
  console.log('[Seeder] Starting database seeding process...');

  try {
    const dataDir = path.join(__dirname, '..', '..', 'data');
    const animeSeedPath = path.join(dataDir, 'anime_seed.json');
    const ratingsSeedPath = path.join(dataDir, 'mock_ratings.csv');

    if (!fs.existsSync(animeSeedPath)) {
      throw new Error(`Anime seed data file not found at: ${animeSeedPath}. Run data scraper first!`);
    }

    if (!fs.existsSync(ratingsSeedPath)) {
      throw new Error(`Mock ratings CSV file not found at: ${ratingsSeedPath}. Run mock generator first!`);
    }

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
    console.log('[Seeder] Seeding mock user accounts (100 users)...');
    // Pre-calculated hash of "password123" to optimize seeding time
    // Generated via bcrypt.hashSync("password123", 10)
    const mockPasswordHash = '$2a$10$f/LhM7T.z5.aD.L2Bv5cEe40.k7KqJ49YV.g7.F942fHqF16yI5k.';
    
    // List of typical favorite genres to randomly distribute
    const genreChoices = ['Action', 'Comedy', 'Sci-Fi', 'Romance', 'Fantasy', 'Thriller', 'Slice of Life'];

    for (let uId = 1; uId <= 100; uId++) {
      const username = `otaku_user${uId}`;
      const email = `user${uId}@animerecs.com`;
      
      // Random favorite genres
      const randGenres = [
        genreChoices[Math.floor(Math.random() * genreChoices.length)],
        genreChoices[Math.floor(Math.random() * genreChoices.length)]
      ].filter((v, i, a) => a.indexOf(v) === i); // Deduplicate

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

    // 3. Seed Watchlist/Ratings
    console.log('[Seeder] Seeding user rating logs (watchlist relations)...');
    const ratingEntries = parseCsv(ratingsSeedPath);
    
    // Bulk create ratings via prisma transaction or loop
    // SQLite can struggle with huge bulk insert statements, so we insert in chunks
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
          } catch (err) {
            // Ignore constraint failures in case user/anime IDs don't match
          }
        })
      );
    }
    console.log(`[Seeder] Seeded ${ratingEntries.length} ratings log entries.`);
    console.log('[Seeder] Database seeding finished successfully!');

  } catch (error) {
    console.error('[Seeder] Fatal error during seeding:', error);
    process.exit(1);
  }
};

seedDatabase()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
