import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Send, Smile, Frown, Flame, Ghost, Coffee, Bot, User as UserIcon } from 'lucide-react';
import { api, type Anime } from '../services/api';
import { AnimeCard } from '../components/AnimeCard';

interface RecommendationsProps {
  onSelectAnime: (anime: Anime) => void;
  user: any;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  animeList?: Anime[];
}

export const Recommendations: React.FC<RecommendationsProps> = ({ onSelectAnime, user }) => {
  const [personalRecs, setPersonalRecs] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Chat states
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: `Hello ${user?.username || 'Otaku'}! I am your AI Anime Assistant. 🌸\n\nAsk me for recommendations, or describe what you want (e.g. "Recommend an action thriller like Attack on Titan").`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadPersonalRecs = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getPersonalRecommendations();
      setPersonalRecs(data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch personalized recommendations. Please rate more titles first!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPersonalRecs();
    }
  }, [user]);

  // Scroll chat window to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Submit Chat Message
  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const msgToSend = textOverride || inputMessage;
    if (!msgToSend.trim()) return;

    // Append user message
    setMessages(prev => [...prev, { sender: 'user', text: msgToSend }]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const response = await api.chat(msgToSend);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: response.reply,
        animeList: response.anime_list || []
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: "I'm having trouble connecting to my cognitive ML service. I will check back once it is online!" 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quick Mood recommendations
  const handleMoodSelect = (mood: string, description: string) => {
    const moodQuery = `Suggest some ${mood} anime. I am feeling ${description}`;
    handleSendMessage(undefined, moodQuery);
  };

  const moods = [
    { label: 'Happy', emoji: Smile, desc: 'happy and looking for funny comedy', color: 'hover:border-emerald-500/50 hover:bg-emerald-950/20 text-emerald-400' },
    { label: 'Sad', emoji: Frown, desc: 'sad and want a moving drama or tearjerker', color: 'hover:border-blue-500/50 hover:bg-blue-950/20 text-blue-400' },
    { label: 'Motivated', emoji: Flame, desc: 'pumped up and want action or sports sports sports', color: 'hover:border-red-500/50 hover:bg-red-950/20 text-red-400' },
    { label: 'Dark', emoji: Ghost, desc: 'mysterious and want a dark psychological thriller or horror', color: 'hover:border-purple-500/50 hover:bg-purple-950/20 text-purple-400' },
    { label: 'Cozy', emoji: Coffee, desc: 'cozy and want a relaxed slice of life', color: 'hover:border-amber-500/50 hover:bg-amber-950/20 text-amber-400' },
  ];

  return (
    <div className="px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 pb-16">
      
      {/* Background glowing orbs */}
      <div className="glow-orb glow-orb-primary w-[500px] h-[500px] top-1/4 left-1/4 animate-pulse pulse-glow" />

      {/* LEFT COLUMN: Hybrid Recommendations Feed */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
          <Sparkles className="h-5.5 w-5.5 text-primary neon-glow" />
          <h2 className="text-xl md:text-2xl font-bold font-display text-white">Your Personal Recommendations</h2>
        </div>

        {error && (
          <div className="glass-panel border border-white/5 p-8 rounded-2xl text-center text-slate-400 space-y-2">
            <p className="text-slate-300 font-semibold">Ready for personalization?</p>
            <p className="text-xs">Your collaborative SVD filtering and content profiles will activate once you log in and rate a few titles in the catalog.</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-slate-900/40 border border-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : personalRecs.length === 0 ? (
          <div className="glass-panel border border-white/5 py-16 rounded-2xl text-center text-slate-400">
            <p className="font-semibold text-slate-300 mb-1">Your watch history is blank!</p>
            <p className="text-xs max-w-sm mx-auto">Please add items to your watchlist and assign ratings (e.g. 9/10) to train your custom recommendation vector.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {personalRecs.map((anime) => (
              <AnimeCard 
                key={anime.id} 
                anime={anime} 
                onSelect={onSelectAnime} 
                user={user} 
              />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: AI Chatbot & Mood Discovery */}
      <div className="lg:col-span-5 flex flex-col space-y-6 h-[calc(100vh-130px)] sticky top-[84px]">
        {/* Mood select box */}
        <div className="glass-panel border border-white/5 p-4 rounded-xl space-y-2.5">
          <h4 className="text-xs text-slate-400 font-bold uppercase tracking-wider">How are you feeling?</h4>
          <div className="flex flex-wrap gap-2">
            {moods.map((m) => {
              const MoodIcon = m.emoji;
              return (
                <button
                  key={m.label}
                  onClick={() => handleMoodSelect(m.label, m.desc)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-white/5 bg-slate-950/40 transition-all duration-300 cursor-pointer ${m.color}`}
                >
                  <MoodIcon className="h-3.5 w-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat window */}
        <div className="glass-panel border border-white/5 rounded-2xl flex flex-col flex-grow overflow-hidden shadow-2xl relative">
          
          {/* Chat Header */}
          <div className="px-4 py-3 bg-slate-950/80 border-b border-white/5 flex items-center space-x-2">
            <div className="bg-primary/20 p-1.5 rounded-lg border border-primary/25">
              <Bot className="h-4 w-4 text-primary neon-glow" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Anime Bot</h4>
              <span className="text-[10px] text-emerald-400 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                Online & Ready
              </span>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => {
              const isBot = msg.sender === 'bot';
              return (
                <div key={index} className={`flex ${isBot ? 'justify-start' : 'justify-end'} items-start space-x-2.5 max-w-[85%] ${isBot ? '' : 'ml-auto'}`}>
                  {isBot && (
                    <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  
                  <div className="space-y-3 w-full">
                    <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow ${
                      isBot 
                        ? 'bg-slate-900 border border-white/5 text-slate-200 rounded-tl-none' 
                        : 'bg-primary border border-primary/20 text-white rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>

                    {/* Chat payload anime results */}
                    {isBot && msg.animeList && msg.animeList.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {msg.animeList.map(anime => (
                          <div 
                            key={anime.id}
                            onClick={() => onSelectAnime(anime)}
                            className="bg-slate-950/60 border border-white/5 hover:border-primary/30 p-2 rounded-xl flex items-center space-x-2 cursor-pointer transition-colors"
                          >
                            <img 
                              src={anime.imageUrl} 
                              alt={anime.title} 
                              className="w-10 h-14 object-cover rounded-md flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="text-[10px] font-bold text-white truncate">{anime.title}</h5>
                              <span className="text-[9px] text-slate-400 block truncate">{anime.genres.split(',')[0]}</span>
                              <div className="flex items-center text-[9px] text-amber-400 font-semibold mt-0.5">
                                <Star className="h-2.5 w-2.5 fill-amber-400 mr-0.5" />
                                <span>{anime.score.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!isBot && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-1">
                      <UserIcon className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Chat loading bubble */}
            {chatLoading && (
              <div className="flex justify-start items-center space-x-2.5 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="bg-slate-900 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-950/60 border-t border-white/5 flex space-x-2 items-center">
            <input
              type="text"
              placeholder="Ask for recommendations..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-grow glass-input py-2.5 px-4 rounded-xl text-xs"
              disabled={chatLoading}
            />
            <button
              type="submit"
              disabled={chatLoading || !inputMessage.trim()}
              className="bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>
      </div>

    </div>
  );
};
export default Recommendations;
