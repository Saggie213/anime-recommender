import https from 'https';

// Jikan API v4 - Unofficial MyAnimeList REST API (free, no auth required)
// Rate limit: 3 requests/second, 60 requests/minute
const JIKAN_BASE = 'https://api.jikan.moe/v4';

interface JikanAnimeEntry {
  mal_id: number;
  title: string;
  title_english: string | null;
  synopsis: string | null;
  genres: { name: string }[];
  themes: { name: string }[];
  demographics: { name: string }[];
  studios: { name: string }[];
  year: number | null;
  aired: { prop?: { from?: { year?: number } } } | null;
  episodes: number | null;
  rating: string | null;
  score: number | null;
  popularity: number | null;
  images: { jpg?: { large_image_url?: string; image_url?: string } };
  status: string | null;
}

export interface ParsedAnime {
  id: number;
  title: string;
  synopsis: string;
  genres: string;
  studio: string;
  releaseYear: number;
  episodes: number;
  rating: string;
  score: number;
  popularity: number;
  imageUrl: string;
  status: string;
}

// Simple HTTPS GET with promise wrapper (no external deps needed)
function httpGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'AnimeRecommender/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

// Sleep helper for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Parse a single Jikan anime item into our DB schema format
function parseAnimeEntry(item: JikanAnimeEntry): ParsedAnime {
  // Combine genres, themes, demographics
  const genresList: string[] = [];
  for (const g of item.genres || []) genresList.push(g.name);
  for (const t of item.themes || []) genresList.push(t.name);
  for (const d of item.demographics || []) genresList.push(d.name);

  // Studios
  const studioList = (item.studios || []).map(s => s.name);
  const studio = studioList.length > 0 ? studioList.join(', ') : 'Unknown Studio';

  // Year extraction
  let year = item.year;
  if (!year && item.aired?.prop?.from?.year) {
    year = item.aired.prop.from.year;
  }
  if (!year) year = 2000;

  return {
    id: item.mal_id,
    title: item.title_english || item.title || 'Unknown Title',
    synopsis: item.synopsis || 'No synopsis available.',
    genres: genresList.filter(Boolean).join(', '),
    studio,
    releaseYear: year,
    episodes: item.episodes || 0,
    rating: item.rating || 'PG-13',
    score: item.score || 0,
    popularity: item.popularity || 0,
    imageUrl: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
    status: item.status || 'Finished Airing',
  };
}

/**
 * Fetch top anime from Jikan API with pagination.
 * @param pages Number of pages to fetch (25 anime per page)
 * @param onProgress Optional callback for progress updates
 * @returns Array of parsed anime entries
 */
export async function fetchTopAnimeFromJikan(
  pages: number = 10,
  onProgress?: (page: number, total: number) => void
): Promise<ParsedAnime[]> {
  const allAnime: ParsedAnime[] = [];

  for (let page = 1; page <= pages; page++) {
    const url = `${JIKAN_BASE}/top/anime?page=${page}`;

    if (onProgress) onProgress(page, pages);
    console.log(`[Jikan] Fetching page ${page}/${pages}...`);

    let retries = 3;
    let data: any = null;

    while (retries > 0) {
      try {
        data = await httpGet(url);
        break;
      } catch (err: any) {
        console.warn(`[Jikan] Error on page ${page}: ${err.message}. Retries left: ${retries - 1}`);
        retries--;
        // Back off longer on failures
        await sleep(retries === 0 ? 1000 : 3000);
      }
    }

    if (!data || !data.data) {
      console.warn(`[Jikan] Failed to fetch page ${page} after retries. Skipping.`);
      continue;
    }

    for (const item of data.data) {
      allAnime.push(parseAnimeEntry(item));
    }

    // Respect Jikan rate limit (3 req/sec → wait 1.5s between requests)
    if (page < pages) {
      await sleep(1500);
    }
  }

  console.log(`[Jikan] Fetched ${allAnime.length} anime entries from ${pages} pages.`);
  return allAnime;
}

/**
 * Fetch anime by specific search query from Jikan.
 */
export async function searchAnimeOnJikan(query: string, limit: number = 25): Promise<ParsedAnime[]> {
  const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=${limit}&order_by=score&sort=desc`;
  
  try {
    const data = await httpGet(url);
    if (!data || !data.data) return [];
    return data.data.map((item: JikanAnimeEntry) => parseAnimeEntry(item));
  } catch (err) {
    console.error(`[Jikan] Search error:`, err);
    return [];
  }
}

/**
 * Fetch currently airing anime from Jikan.
 */
export async function fetchCurrentlyAiring(pages: number = 2): Promise<ParsedAnime[]> {
  const allAnime: ParsedAnime[] = [];

  for (let page = 1; page <= pages; page++) {
    const url = `${JIKAN_BASE}/seasons/now?page=${page}`;
    console.log(`[Jikan] Fetching currently airing page ${page}/${pages}...`);

    try {
      const data = await httpGet(url);
      if (data?.data) {
        for (const item of data.data) {
          allAnime.push(parseAnimeEntry(item));
        }
      }
    } catch (err) {
      console.warn(`[Jikan] Error fetching airing page ${page}:`, err);
    }

    if (page < pages) await sleep(1500);
  }

  return allAnime;
}
