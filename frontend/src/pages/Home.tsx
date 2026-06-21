import React, { useEffect, useState } from 'react';
import { Film, Flame, Star, Compass, Play, Sparkles } from 'lucide-react';
import { api, type Anime } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';

interface HomeProps {
  onSelectAnime: (anime: Anime) => void;
  setCurrentTab: (tab: string) => void;
  user: any;
}

export const Home: React.FC<HomeProps> = ({ onSelectAnime, setCurrentTab, user }) => {
  const [trending, setTrending] = useState<Anime[]>([]);
  const [highestRated, setHighestRated] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [spotlight, setSpotlight] = useState<Anime | null>(null);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        setLoading(true);
        const data = await api.getTrending();
        setTrending(data.trending || []);
        setHighestRated(data.highestRated || []);
        
        // Pick top rated as spotlight hero
        if (data.highestRated && data.highestRated.length > 0) {
          setSpotlight(data.highestRated[0]);
        }
      } catch (err: any) {
        console.error('Failed to load home data:', err);
        setError('Unable to load catalog data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-8 space-y-12">
        {/* Hero Skeleton */}
        <div className="w-full h-[350px] md:h-[450px] rounded-2xl bg-slate-900/40 border border-white/5 animate-pulse flex flex-col justify-end p-8 space-y-4">
          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
          <div className="h-8 bg-slate-800 rounded w-1/2"></div>
          <div className="h-6 bg-slate-800 rounded w-3/4"></div>
        </div>

        {/* List Skeletons */}
        <div className="space-y-6">
          <div className="h-6 bg-slate-900/40 rounded w-1/6 animate-pulse"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-slate-900/40 border border-white/5 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-8 space-y-12 pb-16">
      {/* Background glowing orb */}
      <div className="glow-orb glow-orb-primary w-[500px] h-[500px] -top-20 -left-20 animate-pulse pulse-glow" />

      {error && (
        <div className="glass-panel border border-red-800/30 p-4 rounded-xl text-center text-red-400">
          {error}
        </div>
      )}

      {/* Hero Spotlight */}
      {spotlight && (
        <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950 h-[350px] md:h-[450px] flex flex-col justify-end p-6 md:p-12 shadow-2xl">
          {/* Background Poster Cover */}
          <div className="absolute inset-0 z-0">
            <img 
              src={spotlight.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1200'} 
              alt={spotlight.title}
              className="w-full h-full object-cover opacity-25"
            />
            {/* Ambient gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-bg-dark/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-dark/95 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/25 px-2.5 py-0.5 rounded-full">
                Spotlight Recommendation
              </span>
              <div className="flex items-center space-x-1 text-amber-400 text-xs font-bold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <span>{spotlight.score.toFixed(2)}</span>
              </div>
            </div>

            <h1 className="text-3xl md:text-5xl font-black font-display text-white tracking-wide">
              {spotlight.title}
            </h1>

            <p className="text-slate-300 text-sm md:text-base line-clamp-2 md:line-clamp-3 leading-relaxed">
              {spotlight.synopsis}
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{spotlight.studio}</span>
              <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{spotlight.releaseYear}</span>
              <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{spotlight.episodes} episodes</span>
              <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">{spotlight.rating}</span>
            </div>

            <div className="flex items-center space-x-4 pt-2">
              <button
                onClick={() => onSelectAnime(spotlight)}
                className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-primary/25 cursor-pointer hover:scale-102"
              >
                <Play className="h-4.5 w-4.5 fill-white" />
                <span>Details & Ratings</span>
              </button>
              <button
                onClick={() => setCurrentTab('explore')}
                className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-lg font-semibold transition-all duration-300 cursor-pointer"
              >
                <Compass className="h-4.5 w-4.5 text-slate-400" />
                <span>Explore Catalog</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Onboarding CTA if not logged in */}
      {!user && (
        <div className="glass-panel border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-8">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center justify-center md:justify-start space-x-2">
              <Sparkles className="h-5 w-5 text-primary neon-glow" />
              <span>Personalized AI Recommendations</span>
            </h3>
            <p className="text-sm text-slate-400 max-w-xl">
              Log in to seed your ratings, unlock user-based collaborative SVD filter models, chat with our interactive bot, and visualize your viewing habits.
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('auth')}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 shadow-lg shadow-primary/25 cursor-pointer flex-shrink-0"
          >
            Create Account Now
          </button>
        </div>
      )}

      {/* Trending Today Carousel */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2 pb-1 border-b border-white/5">
          <Flame className="h-5 w-5 text-red-500" />
          <h2 className="text-xl md:text-2xl font-bold font-display text-white">Trending Today</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {trending.slice(0, 6).map((anime) => (
            <AnimeCard 
              key={anime.id} 
              anime={anime} 
              onSelect={onSelectAnime} 
              user={user} 
            />
          ))}
        </div>
      </div>

      {/* Highest Rated Carousel */}
      <div className="space-y-6">
        <div className="flex items-center space-x-2 pb-1 border-b border-white/5">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500/20" />
          <h2 className="text-xl md:text-2xl font-bold font-display text-white">Highest Rated</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {highestRated.slice(0, 6).map((anime) => (
            <AnimeCard 
              key={anime.id} 
              anime={anime} 
              onSelect={onSelectAnime} 
              user={user} 
            />
          ))}
        </div>
      </div>

    </div>
  );
};
export default Home;
