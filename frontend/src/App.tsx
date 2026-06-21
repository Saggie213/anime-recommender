import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Recommendations } from './pages/Recommendations';
import { Dashboard } from './pages/Dashboard';
import { Auth } from './pages/Auth';
import { AnimeDetails } from './pages/AnimeDetails';
import { api, type User } from './services/api';

function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);
  const [sessionChecking, setSessionChecking] = useState<boolean>(true);

  // Restore user session on startup
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('anime_token');
      if (token) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (err) {
          console.warn('Session restoration failed. Clearing invalid credentials.');
          localStorage.removeItem('anime_token');
        }
      }
      setSessionChecking(false);
    };
    checkSession();
  }, []);

  const handleAuthSuccess = (token: string, authenticatedUser: User) => {
    localStorage.setItem('anime_token', token);
    setUser(authenticatedUser);
    setCurrentTab('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('anime_token');
    setUser(null);
    setCurrentTab('home');
  };

  if (sessionChecking) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Securing Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col font-sans relative">
      
      {/* Glow backgrounds */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Navigation */}
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Main Pages Switchboard */}
      <main className="flex-grow max-w-7xl w-full mx-auto relative z-10">
        {currentTab === 'home' && (
          <Home 
            onSelectAnime={(a) => setSelectedAnimeId(a.id)} 
            setCurrentTab={setCurrentTab} 
            user={user} 
          />
        )}
        
        {currentTab === 'explore' && (
          <Explore 
            onSelectAnime={(a) => setSelectedAnimeId(a.id)} 
            user={user} 
          />
        )}

        {currentTab === 'recommendations' && user && (
          <Recommendations 
            onSelectAnime={(a) => setSelectedAnimeId(a.id)} 
            user={user} 
          />
        )}

        {currentTab === 'dashboard' && user && (
          <Dashboard 
            user={user} 
            onUpdateUser={(updated) => setUser(updated)} 
          />
        )}

        {currentTab === 'auth' && !user && (
          <Auth 
            onAuthSuccess={handleAuthSuccess} 
            setCurrentTab={setCurrentTab} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 bg-slate-950/20 text-center text-xs text-slate-500 relative z-10">
        <p>© {new Date().getFullYear()} NeoAnime Recommendations. Developed with FastAPI, Express, and React.</p>
      </footer>

      {/* Overlay Details Modal */}
      {selectedAnimeId !== null && (
        <AnimeDetails
          animeId={selectedAnimeId}
          onClose={() => setSelectedAnimeId(null)}
          user={user}
          onSelectAnime={(a) => setSelectedAnimeId(a.id)}
        />
      )}
    </div>
  );
}

export default App;
