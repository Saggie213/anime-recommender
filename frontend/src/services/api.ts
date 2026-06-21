// Force the API base path to point directly to your live production gateway
const API_BASE_URL = 'https://earnest-ambition-production-ffc5.up.railway.app';

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

// ... Leave all your existing interfaces (Anime, User, WatchlistItem etc.) exactly as they are below this line