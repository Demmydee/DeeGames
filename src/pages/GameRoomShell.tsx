import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Gamepad2, 
  Trophy, 
  ChevronLeft, 
  Loader2, 
  AlertCircle,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  Clock,
  Zap
} from 'lucide-react';
import { matchApi } from '../services/multiplayerApi';
import { Match } from '../types/multiplayer';

const GameRoomShell: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const fetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await matchApi.getById(id);
      setMatch(data);
      if (data.status === 'finished' || data.status === 'cancelled') {
        // Handle end of match
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
    const interval = setInterval(fetchMatch, 5000);
    return () => clearInterval(interval);
  }, [fetchMatch]);

  const handleLeave = async () => {
    if (!id || !window.confirm('Are you sure you want to leave? This may count as a defeat.')) return;
    setLeaving(true);
    try {
      await matchApi.leave(id);
      navigate('/lobby');
    } catch (err: any) {
      alert(err.message);
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505]">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Initializing Game Engine...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] text-center p-4">
        <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
        <h2 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tight">Match Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md">{error || 'This match session is no longer active or you do not have access.'}</p>
        <button 
          onClick={() => navigate('/lobby')}
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Top Bar */}
      <div className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase italic tracking-tight leading-none">
                {match.game_type?.name}
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                {match.room?.name} Arena
              </p>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4">
            <div className="text-center">
              <div className="text-xs font-black text-white">₦{((match.participants?.length || 0) * 1000).toLocaleString()}</div>
              <div className="text-[8px] text-gray-500 uppercase tracking-widest">Prize Pool</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-white">{match.participants?.length}</div>
              <div className="text-[8px] text-gray-500 uppercase tracking-widest">Players</div>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLeave}
            disabled={leaving}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-red-500/20"
          >
            {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Game Viewport */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {/* Placeholder for Game Engine */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent" />
            <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          </div>

          <div className="relative z-10 text-center p-8 max-w-lg">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <div className="w-32 h-32 bg-emerald-500/10 rounded-3xl border-2 border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/10">
                <Zap className="w-16 h-16 text-emerald-500" />
              </div>
              <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-4">
                Game Engine Shell
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed">
                The multiplayer orchestration is active. Wagers are locked. 
                The {match.game_type?.name} module will be plugged in here in the next phase.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                <Shield className="w-5 h-5 text-blue-400 mb-2" />
                <div className="text-xs font-bold text-white uppercase tracking-tight">Fair Play</div>
                <div className="text-[10px] text-gray-500 mt-1">Anti-cheat active</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                <Clock className="w-5 h-5 text-purple-400 mb-2" />
                <div className="text-xs font-bold text-white uppercase tracking-tight">Real-time</div>
                <div className="text-[10px] text-gray-500 mt-1">Low latency sync</div>
              </div>
            </div>
          </div>

          {/* HUD Elements */}
          <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none">
            <div className="flex flex-col gap-4">
              {match.participants?.map((p, i) => (
                <motion.div 
                  key={p.id}
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-2 pr-6 rounded-full bg-black/60 backdrop-blur-md border border-white/10 pointer-events-auto"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${p.status === 'active' ? 'bg-emerald-600' : 'bg-gray-700'}`}>
                    {p.users?.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{p.users?.username}</div>
                    <div className="text-[8px] text-gray-500 uppercase tracking-widest">{p.status}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar (Chat/Log) */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/20 flex flex-col">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Match Log</span>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            <div className="text-[10px] text-emerald-500 font-mono">
              [{new Date(match.started_at).toLocaleTimeString()}] Match started by {match.started_by?.username}
            </div>
            {match.participants?.map((p) => (
              <div key={p.id} className="text-[10px] text-gray-400 font-mono">
                [{new Date(p.joined_at).toLocaleTimeString()}] {p.users?.username} joined the arena
              </div>
            ))}
            <div className="text-[10px] text-blue-400 font-mono animate-pulse">
              [SYSTEM] Waiting for game module initialization...
            </div>
          </div>
          <div className="p-4 border-t border-white/10">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Chat disabled in shell..." 
                disabled
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-500 italic cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoomShell;
