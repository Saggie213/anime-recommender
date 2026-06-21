import React from 'react';
import { Star, Eye, Calendar, Award } from 'lucide-react';
import type { Anime } from '../services/api';

interface AnimeCardProps {
  anime: Anime;
  onSelect: (anime: Anime) => void;
  user?: any;
  onWatchlistUpdate?: (animeId: number, status: string, rating?: number | null) => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onSelect, user, onWatchlistUpdate }) => {
  // Score styling
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40';
    if (score >= 7.5) return 'text-primary bg-primary/10 border-primary/20';
    return 'text-slate-400 bg-slate-900/40 border-slate-800/40';
  };

  const genresArray = anime.genres.split(',').map(g => g.trim()).slice(0, 2);

  // Compute match percentage if final_score or similarity_score or match_score exists
  let matchPercentage = null;
  if (anime.final_score !== undefined) {
    matchPercentage = Math.round(anime.final_score * 100);
  } else if (anime.similarity_score !== undefined) {
    matchPercentage = Math.round(anime.similarity_score * 100);
  } else if (anime.match_score !== undefined) {
    matchPercentage = Math.round(anime.match_score * 100);
  }

  // Cap match percentage at 99% unless it is perfect similarity
  if (matchPercentage !== null && matchPercentage > 99 && matchPercentage < 100) {
    matchPercentage = 99;
  }

  const handleQuickWatchlist = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    if (onWatchlistUpdate) {
      onWatchlistUpdate(anime.id, status, null);
    }
  };

  return (
    <div 
      onClick={() => onSelect(anime)}
      className="group relative flex flex-col rounded-xl overflow-hidden glass-panel border border-white/5 cursor-pointer hover:border-primary/45 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
    >
      {/* Anime Cover */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-950">
        <img 
          src={anime.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300'} 
          alt={anime.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Rating Overlay */}
        <div className="absolute top-2 left-2 flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold border backdrop-blur-md bg-black/60 border-white/10">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span className="text-white">{anime.score.toFixed(2)}</span>
        </div>

        {/* Match Percentage Glow overlay */}
        {matchPercentage !== null && (
          <div className="absolute top-2 right-2 flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold border backdrop-blur-md bg-primary/20 border-primary/45 text-white neon-glow">
            <Award className="h-3.5 w-3.5 text-primary fill-primary" />
            <span>{matchPercentage}% Match</span>
          </div>
        )}

        {/* Quick Watchlist actions on hover */}
        {user && onWatchlistUpdate && (
          <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center px-4 space-y-2">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase mb-2">Add to Watchlist</span>
            
            <button
              onClick={(e) => handleQuickWatchlist(e, 'WATCHING')}
              className="w-full py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Watching
            </button>
            <button
              onClick={(e) => handleQuickWatchlist(e, 'COMPLETED')}
              className="w-full py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              Completed
            </button>
            <button
              onClick={(e) => handleQuickWatchlist(e, 'PLAN_TO_WATCH')}
              className="w-full py-1.5 rounded-lg text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
            >
              Plan to Watch
            </button>
            
            {anime.userStatus && (
              <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full mt-2">
                Current: {anime.userStatus.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex flex-col flex-grow">
        {/* Title */}
        <h3 className="font-semibold text-slate-100 line-clamp-1 group-hover:text-primary transition-colors text-sm md:text-base">
          {anime.title}
        </h3>

        {/* Studio */}
        <span className="text-xs text-slate-400 mt-0.5">{anime.studio}</span>

        {/* Release Year & Episodes */}
        <div className="flex items-center space-x-3 text-slate-400 text-xs mt-2.5">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3 text-slate-500" />
            <span>{anime.releaseYear}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="h-3 w-3 text-slate-500" />
            <span>{anime.episodes ? `${anime.episodes} eps` : 'Movie/OVA'}</span>
          </div>
        </div>

        {/* Genre pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          {genresArray.map((genre) => (
            <span 
              key={genre}
              className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300 font-medium"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
export default AnimeCard;
