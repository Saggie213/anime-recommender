// API base URL: use environment variable if available, otherwise hardcoded production URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://earnest-ambition-production-ffc5.up.railway.app';

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface Anime {
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
  // Optional fields returned from specific endpoints
  userStatus?: string | null;
  userRating?: number | null;
  userWatchedEpisodes?: number;
  final_score?: number;
  content_score?: number;
  collaborative_score?: number;
  popularity_score?: number;
  similarity_score?: number;
  match_score?: number;
  is_fallback?: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  favoriteGenres: string[];
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AnimeListResponse {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  data: Anime[];
}

export interface TrendingResponse {
  trending: Anime[];
  highestRated: Anime[];
}

export interface AnalyticsResponse {
  totalCount: number;
  completedCount: number;
  watchingCount: number;
  planToWatchCount: number;
  droppedCount: number;
  totalEpisodes: number;
  averageRating: number;
  genreDistribution: { name: string; value: number }[];
  ratingDistribution: { rating: number; count: number }[];
  statusDistribution: { name: string; value: number; color: string }[];
}

export interface ChatResponse {
  reply: string;
  anime_list: Anime[];
}

export interface ExplanationResponse {
  explanation: string;
}

// ─── Helper Utilities ───────────────────────────────────────────────────────

const getHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('anime_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data as T;
}

// ─── API Methods ────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  login: (emailOrUsername: string, password: string): Promise<AuthResponse> =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    }),

  signup: (username: string, email: string, password: string, favoriteGenres: string[]): Promise<AuthResponse> =>
    request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, favoriteGenres }),
    }),

  getProfile: (): Promise<User> =>
    request<User>('/api/auth/profile'),

  updateProfile: (data: { email?: string; password?: string; favoriteGenres?: string[] }): Promise<{ message: string; user: User }> =>
    request<{ message: string; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ── Anime Catalog ────────────────────────────────────────────────────────
  getAnimeList: (params: { page?: number; limit?: number; search?: string; genre?: string; sortBy?: string }): Promise<AnimeListResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.search) query.set('search', params.search);
    if (params.genre) query.set('genre', params.genre);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    return request<AnimeListResponse>(`/api/anime?${query.toString()}`);
  },

  getTrending: (): Promise<TrendingResponse> =>
    request<TrendingResponse>('/api/anime/trending'),

  getAnimeDetails: (animeId: number): Promise<Anime> =>
    request<Anime>(`/api/anime/${animeId}`),

  // ── Watchlist ────────────────────────────────────────────────────────────
  updateWatchlist: (animeId: number, status: string, rating: number | null, watchedEpisodes: number): Promise<any> =>
    request<any>('/api/anime/watchlist', {
      method: 'POST',
      body: JSON.stringify({ animeId, status, rating, watchedEpisodes }),
    }),

  // ── Recommendations ──────────────────────────────────────────────────────
  getPersonalRecommendations: (): Promise<Anime[]> =>
    request<Anime[]>('/api/recommendations/personal'),

  getSimilarAnime: (animeId: number): Promise<Anime[]> =>
    request<Anime[]>(`/api/recommendations/similar/${animeId}`),

  explainRecommendation: (animeId: number): Promise<ExplanationResponse> =>
    request<ExplanationResponse>(`/api/recommendations/explain/${animeId}`),

  // ── Chat & Semantic Search ───────────────────────────────────────────────
  chat: (message: string): Promise<ChatResponse> =>
    request<ChatResponse>('/api/recommendations/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  semanticSearch: (query: string): Promise<Anime[]> =>
    request<Anime[]>('/api/recommendations/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  // ── Analytics ────────────────────────────────────────────────────────────
  getAnalytics: (): Promise<AnalyticsResponse> =>
    request<AnalyticsResponse>('/api/analytics'),
};