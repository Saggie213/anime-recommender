import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, Star, Clock, List, Settings, Mail, RefreshCw, Award } from 'lucide-react';
import { api, type AnalyticsResponse } from '../services/api';

interface DashboardProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onUpdateUser }) => {
  const [stats, setStats] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Profile settings
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [settingsMsg, setSettingsMsg] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAnalytics();
      setStats(data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load user analytics. Please rate some titles first!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMsg('');
    try {
      const res = await api.updateProfile({
        email,
        password: password || undefined
      });
      onUpdateUser(res.user);
      setPassword('');
      setSettingsMsg('Profile updated successfully!');
    } catch (err: any) {
      setSettingsMsg(`Error: ${err.message || 'Update failed'}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-8 space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-900/40 border border-white/5"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-[300px] rounded-xl bg-slate-900/40 border border-white/5"></div>
          <div className="h-[300px] rounded-xl bg-slate-900/40 border border-white/5"></div>
        </div>
      </div>
    );
  }

  // Calculate hours watched (avg 24 mins per episode)
  const hoursWatched = stats ? Math.round((stats.totalEpisodes * 24) / 60) : 0;

  return (
    <div className="px-4 md:px-8 py-8 space-y-8 pb-16 relative z-10">
      
      {/* Background glow orb */}
      <div className="glow-orb glow-orb-primary w-[450px] h-[450px] -bottom-20 -right-20 animate-pulse pulse-glow" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-white">Your Analytics & Profile</h1>
          <p className="text-sm text-slate-400">Track your anime statistics and personalize your dashboard</p>
        </div>
        <button
          onClick={loadAnalytics}
          className="flex items-center space-x-1 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Stats</span>
        </button>
      </div>

      {stats && stats.totalCount > 0 ? (
        <>
          {/* Aggregated Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Tracked */}
            <div className="glass-panel border border-white/5 p-5 rounded-2xl flex items-center space-x-4">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <List className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Tracked</span>
                <h3 className="text-2xl font-extrabold text-white mt-0.5">{stats.totalCount}</h3>
                <span className="text-[10px] text-slate-400">{stats.watchingCount} watching</span>
              </div>
            </div>

            {/* Average Score */}
            <div className="glass-panel border border-white/5 p-5 rounded-2xl flex items-center space-x-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Star className="h-6 w-6 fill-amber-400/10" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Average Rating</span>
                <h3 className="text-2xl font-extrabold text-white mt-0.5">{stats.averageRating || 'N/A'}</h3>
                <span className="text-[10px] text-slate-400">out of 10 stars</span>
              </div>
            </div>

            {/* Time Watched */}
            <div className="glass-panel border border-white/5 p-5 rounded-2xl flex items-center space-x-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Time Watched</span>
                <h3 className="text-2xl font-extrabold text-white mt-0.5">{hoursWatched} Hrs</h3>
                <span className="text-[10px] text-slate-400">{stats.totalEpisodes} episodes total</span>
              </div>
            </div>

            {/* Favorites Onboarding Genre */}
            <div className="glass-panel border border-white/5 p-5 rounded-2xl flex items-center space-x-4">
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Top Genre</span>
                <h3 className="text-lg font-extrabold text-white mt-1.5 truncate max-w-[120px]">
                  {stats.genreDistribution[0]?.name || 'N/A'}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {stats.genreDistribution[0] ? `${stats.genreDistribution[0].value} completed titles` : 'Rate to compute'}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Displays */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left: Genre Radar Chart */}
            <div className="lg:col-span-6 glass-panel border border-white/5 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <BarChart2 className="h-4.5 w-4.5 text-primary" />
                <span>Genre Distribution</span>
              </h3>
              <div className="h-[300px] w-full flex items-center justify-center">
                {stats.genreDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.genreDistribution}>
                      <PolarGrid stroke="rgba(255,255,255,0.06)" />
                      <PolarAngleAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="rgba(255,255,255,0.1)" tick={{ fontSize: 8 }} />
                      <Radar name="Title Count" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                      <Tooltip 
                        contentStyle={{ background: '#121420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                        labelClassName="text-white text-xs font-semibold"
                        itemStyle={{ color: '#8b5cf6', fontSize: '11px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-500">Rate and complete anime to view genre maps.</span>
                )}
              </div>
            </div>

            {/* Right: Personal Rating Frequency */}
            <div className="lg:col-span-6 glass-panel border border-white/5 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <BarChart2 className="h-4.5 w-4.5 text-primary" />
                <span>Personal Ratings Distribution</span>
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.ratingDistribution}>
                    <XAxis dataKey="rating" stroke="#64748b" tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tickLine={false} tick={{ fontSize: 10 }} width={20} />
                    <Tooltip
                      contentStyle={{ background: '#121420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      labelStyle={{ color: '#64748b', fontSize: '10px' }}
                      itemStyle={{ color: '#f59e0b', fontSize: '11px' }}
                      labelFormatter={(label) => `Rating: ${label}/10`}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Status Breakdown */}
            <div className="lg:col-span-4 glass-panel border border-white/5 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <BarChart2 className="h-4.5 w-4.5 text-primary" />
                <span>List Breakdown</span>
              </h3>
              <div className="h-[220px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#121420', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total</span>
                  <p className="text-xl font-black text-white">{stats.totalCount}</p>
                </div>
              </div>
              {/* Legend labels */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
                {stats.statusDistribution.map((s) => (
                  <div key={s.name} className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span>{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* User Settings Forms (Account parameters) */}
            <div className="lg:col-span-8 glass-panel border border-white/5 p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Settings className="h-4.5 w-4.5 text-primary" />
                <span>Account Settings</span>
              </h3>
              
              {settingsMsg && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${
                  settingsMsg.startsWith('Error') 
                    ? 'bg-red-950/40 border border-red-800/40 text-red-400' 
                    : 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                }`}>
                  {settingsMsg}
                </div>
              )}

              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-semibold flex items-center">
                      <Mail className="h-3.5 w-3.5 text-slate-500 mr-1" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full glass-input py-2 px-3 text-xs"
                      required
                    />
                  </div>
                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-semibold">Change Password</label>
                    <input
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full glass-input py-2 px-3 text-xs"
                    />
                  </div>
                </div>
                {/* Onboarding info read only details */}
                <div className="text-[11px] text-slate-500">
                  Otaku Profile registered: {new Date(user?.createdAt).toLocaleDateString()}. Initial genres preferences: {user?.favoriteGenres?.join(', ')}.
                </div>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {settingsLoading ? 'Saving changes...' : 'Save Settings'}
                </button>
              </form>
            </div>

          </div>
        </>
      ) : (
        <div className="glass-panel border border-white/5 py-20 rounded-2xl text-center space-y-4 relative">
          <p className="text-lg font-semibold text-slate-300">Your profile statistics are empty</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Once you log in and rate anime, we'll draw maps of your preferred genres and rating habits here.
          </p>
        </div>
      )}

    </div>
  );
};
export default Dashboard;
