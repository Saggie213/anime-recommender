const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper to set authorization headers
const getHeaders = () => {
  const token = localStorage.getItem('anime_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Generic fetch wrapper
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
  userStatus?: string | null;
  userRating?: number | null;
  userWatchedEpisodes?: number;
  final_score?: number;
  similarity_score?: number;
  match_score?: number;
  is_fallback?: boolean;
}

export interface WatchlistItem {
  userId: number;
  animeId: number;
  status: string; // 'WATCHING', 'COMPLETED', 'PLAN_TO_WATCH', 'DROPPED'
  rating: number | null;
  watchedEpisodes: number;
  updatedAt: string;
  anime: Anime;
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

export interface PaginatedResponse<T> {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  data: T[];
}

export interface TrendingResponse {
  trending: Anime[];
  highestRated: Anime[];
}

export interface ChatResponse {
  reply: string;
  anime_list: Anime[];
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

export const api = {
  // Authentication
  login: (emailOrUsername: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    }),

  signup: (username: string, email: string, password: string, favoriteGenres: string[]) =>
    request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, favoriteGenres }),
    }),

  getProfile: () => request<User>('/auth/profile'),
  
  updateProfile: (data: { email?: string; favoriteGenres?: string[]; password?: string }) =>
    request<{ message: string; user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Anime Browsing
  getAnimeList: (params: { page?: number; limit?: number; search?: string; genre?: string; sortBy?: string }) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.genre) query.append('genre', params.genre);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    return request<PaginatedResponse<Anime>>(`/anime?${query.toString()}`);
  },

  getTrending: () => request<TrendingResponse>('/anime/trending'),

  getAnimeDetails: (id: number) => request<Anime>(`/anime/${id}`),

  // Watchlist Actions
  getWatchlist: () => request<WatchlistItem[]>('/anime/watchlist'),

  updateWatchlist: (animeId: number, status: string, rating?: number | null, watchedEpisodes?: number) =>
    request<{ message: string; data: any }>('/anime/watchlist', {
      method: 'POST',
      body: JSON.stringify({ animeId, status, rating, watchedEpisodes }),
    }),

  // Recommendation Proxies
  getPersonalRecommendations: () => request<Anime[]>('/recommendations/personal'),

  getSimilarAnime: (animeId: number) => request<Anime[]>(`/recommendations/similar/${animeId}`),

  explainRecommendation: (animeId: number) =>
    request<{ explanation: string }>(`/recommendations/explain/${animeId}`),

  semanticSearch: (query: string) =>
    request<Anime[]>('/recommendations/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  chat: (message: string) =>
    request<ChatResponse>('/recommendations/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Dashboard Analytics
  getAnalytics: () => request<AnalyticsResponse>('/analytics'),
};
