import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Sparkles, Chrome, Github, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface AuthProps {
  onAuthSuccess: (token: string, user: any) => void;
  setCurrentTab: (tab: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, setCurrentTab }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Onboarding Genres Selection
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [signUpData, setSignUpData] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const genresOptions = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
    'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 
    'Sports', 'Suspense', 'Award Winning'
  ];

  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.login(email, password);
      onAuthSuccess(response.token, response.user);
      setCurrentTab('home');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handlePreSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    // Store credentials temporarily and show onboarding genre select
    setSignUpData({ username, email, password });
    setIsOnboarding(true);
  };

  const handleFinalSignUp = async () => {
    if (selectedGenres.length < 2) {
      setError('Please select at least 2 favorite genres to personalize recommendations');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.signup(
        signUpData.username,
        signUpData.email,
        signUpData.password,
        selectedGenres
      );
      onAuthSuccess(response.token, response.user);
      setCurrentTab('home');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Mock OAuth Handler for quick portfolios
  const handleMockOAuth = async (provider: 'Google' | 'GitHub') => {
    setLoading(true);
    setError('');
    
    // Simulate short network delay
    setTimeout(async () => {
      try {
        const mockUsername = `${provider.toLowerCase()}_otaku_${Math.floor(100 + Math.random() * 900)}`;
        const mockEmail = `${mockUsername}@animerecs.com`;
        const mockPassword = 'oauth_simulated_password_12345';
        const defaultGenres = ['Action', 'Sci-Fi', 'Adventure'];

        const response = await api.signup(mockUsername, mockEmail, mockPassword, defaultGenres);
        onAuthSuccess(response.token, response.user);
        setCurrentTab('home');
      } catch (err: any) {
        // If registration fails because it exists, we attempt standard login
        try {
          const providerUsername = `${provider.toLowerCase()}_otaku_demo`;
          const response = await api.login(providerUsername, 'oauth_simulated_password_12345');
          onAuthSuccess(response.token, response.user);
          setCurrentTab('home');
        } catch (subErr) {
          setError(`Simulated ${provider} authentication failed.`);
        }
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="relative min-h-[calc(100vh-68px)] flex items-center justify-center px-4 py-12">
      {/* Background glowing orbs */}
      <div className="glow-orb glow-orb-primary w-[400px] h-[400px] top-1/4 left-1/4" />
      <div className="glow-orb glow-orb-secondary w-[300px] h-[300px] bottom-1/4 right-1/4 animate-pulse pulse-glow" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel border border-white/5 p-8 rounded-2xl shadow-2xl">
          
          {/* HEADER */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-primary bg-clip-text text-transparent mb-2">
              {isOnboarding ? 'Tailor Your Feed' : isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-slate-400">
              {isOnboarding 
                ? 'Select genres you enjoy to align recommendations'
                : isLogin 
                  ? 'Sign in to access your recommendations' 
                  : 'Start tracking and discover new recommendations'}
            </p>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-800/40 text-red-400 p-3 rounded-lg text-sm mb-6 flex items-start space-x-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* ONBOARDING FLOW */}
          {isOnboarding ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {genresOptions.map((genre) => {
                  const isSelected = selectedGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-200 text-left ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white shadow-md shadow-primary/10'
                          : 'bg-slate-900/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsOnboarding(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Back
                </button>
                <span className="text-xs text-slate-400">
                  Selected: <span className="text-primary font-bold">{selectedGenres.length}</span> (min 2)
                </span>
              </div>

              <button
                type="button"
                onClick={handleFinalSignUp}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                <span>{loading ? 'Personalizing...' : 'Complete Signup'}</span>
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* STANDARD LOGIN / REGISTER FORM */
            <form onSubmit={isLogin ? handleLoginSubmit : handlePreSignUpSubmit} className="space-y-5">
              
              {!isLogin && (
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={isLogin ? "Email or Username" : "Email Address"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg glass-input text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Select Interests'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {/* OAUTH MOCKS */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-widest">Or login with</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleMockOAuth('Google')}
                  className="flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-white/5 bg-slate-900/40 text-slate-300 hover:bg-white/5 transition-colors text-xs font-semibold"
                >
                  <Chrome className="h-4 w-4 text-red-400" />
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMockOAuth('GitHub')}
                  className="flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-white/5 bg-slate-900/40 text-slate-300 hover:bg-white/5 transition-colors text-xs font-semibold"
                >
                  <Github className="h-4 w-4 text-purple-400" />
                  <span>GitHub</span>
                </button>
              </div>

              {/* SWITCH MODE */}
              <div className="text-center pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="text-xs text-slate-400 hover:text-primary transition-colors font-medium"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center justify-center space-x-1.5 mt-8 text-[10px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Secure JWT Encryption Access</span>
          </div>

        </div>
      </div>
    </div>
  );
};
export default Auth;
