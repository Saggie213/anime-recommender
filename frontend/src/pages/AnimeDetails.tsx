import React, { useEffect, useState } from 'react';
import { Star, Eye, Calendar, Sparkles, X, Heart, PlusCircle, CheckCircle } from 'lucide-react';
import { api, type Anime } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';

interface AnimeDetailsProps {
  animeId: number;
  onClose: () => void;
  user: any;
  onSelectAnime: (anime: Anime) => void;
  onWatchlistUpdated?: () => void;
}

export const AnimeDetails: React.FC<AnimeDetailsProps> = ({ animeId, onClose, user, onSelectAnime, onWatchlistUpdated }) => {
  const [anime, setAnime] = useState<Anime | null>(null);
  const [similar, setSimilar] = useState<Anime[]>([]);
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [error, setError] = useState('');

  // Watchlist form states
  const [status, setStatus] = useState('PLAN_TO_WATCH');
  const [rating, setRating] = useState<number | null>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState(0);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        // 1. Fetch Anime Details (includes user status/rating if authenticated)
        const animeData = await api.getAnimeDetails(animeId);
        setAnime(animeData);

        // Prepopulate form
        if (animeData.userStatus) setStatus(animeData.userStatus);
        if (animeData.userRating) setRating(animeData.userRating);
        setWatchedEpisodes(animeData.userWatchedEpisodes || 0);

        // 2. Fetch Similar Anime
        const similarData = await api.getSimilarAnime(animeId);
        setSimilar(similarData.slice(0, 6) || []);

        // 3. Fetch Explanation if user is logged in
        if (user) {
          try {
            const explanationData = await api.explainRecommendation(animeId);
            setExplanation(explanationData.explanation);
          } catch {
            setExplanation('Recommended based on general popularity and high ratings.');
          }
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load anime details.');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [animeId]);

  const handleWatchlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anime) return;

    try {
      setWatchlistLoading(true);
      setSavedSuccess(false);
      
      await api.updateWatchlist(anime.id, status, rating, watchedEpisodes);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      
      if (onWatchlistUpdated) onWatchlistUpdated();
    } catch (err) {
      console.error(err);
      alert('Failed to update watchlist');
    } finally {
      setWatchlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-4xl rounded-2xl p-8 border border-white/5 animate-pulse h-[600px] flex flex-col justify-between">
          <div className="flex space-x-6">
            <div className="w-1/3 aspect-[3/4] bg-slate-900 rounded-xl"></div>
            <div className="w-2/3 space-y-4">
              <div className="h-6 bg-slate-900 rounded w-1/3"></div>
              <div className="h-12 bg-slate-900 rounded w-2/3"></div>
              <div className="h-24 bg-slate-900 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!anime) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto flex items-start justify-center p-4 py-8">
      {/* Modal Container */}
      <div className="relative glass-panel w-full max-w-4xl rounded-2xl border border-white/5 shadow-2xl p-6 md:p-8 mt-4 space-y-8 animate-fade-in bg-[#10121d]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-lg bg-slate-900/60 border border-white/5 hover:border-white/15 hover:bg-slate-900 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Top Info Layout */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Cover Art */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <img 
              src={anime.imageUrl} 
              alt={anime.title}
              className="w-full rounded-xl object-cover border border-white/5 shadow-xl aspect-[3/4]"
            />
          </div>

          {/* Details Column */}
          <div className="flex-grow space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-semibold">
                {anime.studio}
              </span>
              <div className="flex items-center space-x-1 text-amber-400 text-xs font-bold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <span>{anime.score.toFixed(2)}</span>
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-black font-display text-white">
              {anime.title}
            </h2>

            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <div className="flex items-center space-x-1 bg-white/5 border border-white/5 px-2 py-1 rounded-md">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>{anime.releaseYear}</span>
              </div>
              <div className="flex items-center space-x-1 bg-white/5 border border-white/5 px-2 py-1 rounded-md">
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                <span>{anime.episodes ? `${anime.episodes} Episodes` : 'Movie/OVA'}</span>
              </div>
              <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-md">{anime.rating}</span>
              <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-md">Rank #{anime.popularity}</span>
            </div>

            {/* Synopsis */}
            <div className="space-y-1.5">
              <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Synopsis</h4>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {anime.synopsis}
              </p>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {anime.genres.split(',').map((g) => (
                <span 
                  key={g} 
                  className="text-xs bg-slate-900 border border-white/5 px-2.5 py-1 rounded-lg text-slate-300 font-medium"
                >
                  {g.trim()}
                </span>
              ))}
            </div>

            {/* AI Explainable recommendations block */}
            {user && explanation && (
              <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start space-x-3 relative overflow-hidden">
                {/* Glow backdrop inside explain */}
                <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                <Sparkles className="h-5 w-5 text-primary neon-glow flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-primary uppercase tracking-wider">Recommendation Insight</span>
                  <p className="text-slate-300 leading-relaxed">{explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Watchlist Manager Panel (Only if authenticated) */}
        {user ? (
          <div className="p-5 md:p-6 rounded-xl border border-white/5 bg-slate-950/40 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Heart className="h-4.5 w-4.5 text-primary" />
              <span>Update Watch Logs</span>
            </h3>

            <form onSubmit={handleWatchlistSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* Watch Status */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold">Watch Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 text-slate-300 text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-primary"
                >
                  <option value="WATCHING">Currently Watching</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PLAN_TO_WATCH">Plan to Watch</option>
                  <option value="DROPPED">Dropped</option>
                </select>
              </div>

              {/* Personal Rating */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold">
                  Personal Rating: {rating ? `${rating}/10` : 'None'}
                </label>
                <select
                  value={rating || ''}
                  onChange={(e) => setRating(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full bg-slate-900 border border-white/5 text-slate-300 text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-primary"
                >
                  <option value="">No Rating</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i+1} value={i+1}>{i+1} - {i+1 === 10 ? 'Masterpiece' : i+1 === 9 ? 'Great' : i+1 === 7 ? 'Good' : i+1 === 5 ? 'Average' : i+1 === 1 ? 'Appalling' : i+1}</option>
                  ))}
                </select>
              </div>

              {/* Episode Progress */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold">
                  Episode Progress {anime.episodes ? `(Max ${anime.episodes})` : ''}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    max={anime.episodes || 9999}
                    value={watchedEpisodes}
                    onChange={(e) => setWatchedEpisodes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-white/5 text-slate-300 text-sm rounded-lg py-2 px-3 focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={watchlistLoading}
                    className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 flex-shrink-0 cursor-pointer"
                  >
                    {savedSuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span>Saved</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4" />
                        <span>{watchlistLoading ? 'Saving...' : 'Update'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-white/5 bg-slate-950/20 text-center text-xs text-slate-400">
            Please log in to add this anime to your watchlist, rate it, and generate customized recommendations.
          </div>
        )}

        {/* Similar Anime recommendations */}
        {similar.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Similar Suggestions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similar.map((simAnime) => (
                <div 
                  key={simAnime.id} 
                  onClick={() => onSelectAnime(simAnime)}
                  className="group cursor-pointer space-y-1.5"
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-lg bg-slate-900 border border-white/5 relative">
                    <img 
                      src={simAnime.imageUrl} 
                      alt={simAnime.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1.5 left-1.5 flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] bg-black/60 border border-white/5 font-semibold text-amber-400">
                      <Star className="h-2.5 w-2.5 fill-amber-400" />
                      <span>{simAnime.score.toFixed(1)}</span>
                    </div>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-300 group-hover:text-primary transition-colors line-clamp-1">
                    {simAnime.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default AnimeDetails;
