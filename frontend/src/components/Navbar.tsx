import React from 'react';
import { Film, User as UserIcon, LogOut, Compass, Sparkles, BarChart2, Home as HomeIcon } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, user, onLogout }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'recommendations', label: 'Match Hub', icon: Sparkles, requiresAuth: true },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2, requiresAuth: true },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 md:px-8 py-3 flex items-center justify-between">
      {/* Logo */}
      <div 
        className="flex items-center space-x-2 cursor-pointer group"
        onClick={() => setCurrentTab('home')}
      >
        <div className="bg-primary/20 p-2 rounded-lg group-hover:bg-primary/30 transition-all duration-300">
          <Film className="h-6 w-6 text-primary neon-glow" />
        </div>
        <span className="text-xl font-bold tracking-wider font-display bg-gradient-to-r from-white via-slate-200 to-primary bg-clip-text text-transparent">
          NEO<span className="text-primary">ANIME</span>
        </span>
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex items-center space-x-1">
        {navItems.map((item) => {
          if (item.requiresAuth && !user) return null;
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary border-b border-primary/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80"
              onClick={() => setCurrentTab('dashboard')}
            >
              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden sm:inline text-sm font-medium text-slate-300">
                {user.username}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
              title="Log Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCurrentTab('auth')}
            className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 shadow-lg shadow-primary/20"
          >
            <UserIcon className="h-4 w-4" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
