import React, { useEffect, useState } from 'react';
import { Search, Sparkles, Filter, SlidersHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';
import { api, type Anime } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';

interface ExploreProps {
  onSelectAnime: (anime: Anime) => void;
  user: any;
}

export const Explore: React.FC<ExploreProps> = ({ onSelectAnime, user }) => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [isSemantic, setIsSemantic] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('score');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;

  const genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
    'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Thriller'
  ];

  const fetchAnime = async () => {
    try {
      setLoading(true);
      setError('');

      if (isSemantic && searchTerm.trim().length > 2) {
        // NLP Semantic Search Proxy
        const results = await api.semanticSearch(searchTerm);
        setAnimeList(results);
        setTotalPages(1); // Semantic search outputs a fixed relevant list
        setPage(1);
      } else {
        // Standard SQL browse
        const response = await api.getAnimeList({
          page,
          limit,
          search: searchTerm,
          genre: selectedGenre,
          sortBy
        });
        setAnimeList(response.data || []);
        setTotalPages(response.totalPages || 1);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch anime. Please try adjusting your filters.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch when browsing filters change
  useEffect(() => {
    // Reset page on filter changes
    if (!isSemantic) {
      fetchAnime();
    }
  }, [page, selectedGenre, sortBy]);

  // Handle Search Execution
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAnime();
  };

  // Fetch immediately if search term cleared
  useEffect(() => {
    if (searchTerm === '' && !isSemantic) {
      setPage(1);
      fetchAnime();
    }
  }, [searchTerm]);

  return (
    <div className="px-4 md:px-8 py-8 space-y-8 pb-16">
      {/* Glow ambient background */}
      <div className="glow-orb glow-orb-secondary w-[400px] h-[400px] top-1/3 right-1/4 animate-pulse pulse-glow" />

      {/* Title */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Explore Catalog</h1>
        <p className="text-sm text-slate-400">Search top anime titles or toggle Semantic Search to describe what you want in natural language.</p>
      </div>

      {/* Filters & Search Controls */}
      <div className="glass-panel border border-white/5 p-4 md:p-6 rounded-2xl space-y-4 relative z-10">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
            <input
              type="text"
              placeholder={
                isSemantic 
                  ? "Describe themes, characters, or mood (e.g. 'mind games like Death Note', 'heartwarming slice of life')" 
                  : "Search anime title..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm"
            />
            {isSemantic && (
              <span className="absolute right-3.5 top-3 text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 neon-glow">
                <Sparkles className="h-3 w-3" />
                <span>AI SEARCH ACTIVE</span>
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {/* Toggle Semantic Search */}
            <button
              type="button"
              onClick={() => {
                const targetSemantic = !isSemantic;
                setIsSemantic(targetSemantic);
                if (targetSemantic) {
                  setSelectedGenre(''); // disable genres for semantic query
                }
              }}
              className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all duration-300 ${
                isSemantic
                  ? 'bg-primary/20 border-primary text-white neon-glow'
                  : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Semantic Search</span>
            </button>

            {/* Execute Button */}
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-primary/15"
            >
              Search
            </button>
          </div>
        </form>

        {/* Catalog Filters Row (Hidden when Semantic Search is active to prevent indexing conflicts) */}
        {!isSemantic && (
          <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-between border-t border-white/5">
            {/* Genres Horizontal List */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-slate-500 font-semibold uppercase flex items-center mr-1">
                <Filter className="h-3.5 w-3.5 mr-1" /> Genres:
              </span>
              <button
                onClick={() => { setSelectedGenre(''); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedGenre === '' 
                    ? 'bg-white/10 text-white border border-white/10' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All Genres
              </button>
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => { setSelectedGenre(genre); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedGenre === genre 
                      ? 'bg-primary/15 text-primary border border-primary/25' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Sorting */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-semibold uppercase">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="bg-slate-900 border border-white/5 text-slate-300 text-xs rounded-lg py-1.5 px-3 focus:outline-none focus:border-primary"
              >
                <option value="score">Highest Rated</option>
                <option value="popularity">Most Popular</option>
                <option value="title">Alphabetical</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="glass-panel border border-red-950/40 p-4 rounded-xl text-center text-red-400">
          {error}
        </div>
      )}

      {/* Grid Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 relative z-10">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex flex-col aspect-[3/4] rounded-xl bg-slate-900/40 border border-white/5 animate-pulse"></div>
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="glass-panel border border-white/5 py-16 rounded-2xl text-center text-slate-400 space-y-2 relative z-10">
          <p className="text-lg font-semibold text-slate-300">No anime titles found</p>
          <p className="text-sm">Try broadening your search term or selecting a different genre.</p>
        </div>
      ) : (
        <div className="space-y-8 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {animeList.map((anime) => (
              <AnimeCard 
                key={anime.id} 
                anime={anime} 
                onSelect={onSelectAnime} 
                user={user} 
              />
            ))}
          </div>

          {/* Browse Pagination (Hidden in Semantic search which yields single list) */}
          {!isSemantic && totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center space-x-1 bg-slate-900/40 border border-white/5 hover:border-white/10 hover:text-white px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>
              <span className="text-xs text-slate-400 font-semibold">
                Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center space-x-1 bg-slate-900/40 border border-white/5 hover:border-white/10 hover:text-white px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default Explore;
