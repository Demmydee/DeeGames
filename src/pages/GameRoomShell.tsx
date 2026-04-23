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
  Zap,
  ShieldAlert,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { matchApi, gameApi } from '../services/multiplayerApi';
import { Match } from '../types/multiplayer';
import { useAuth } from '../context/AuthContext';
import VoiceChat from '../components/VoiceChat';
import Chat from '../components/Chat';
import ReportModal from '../components/ReportModal';
import DiceGameUI from '../components/DiceGameUI';
import ChessGameUI from '../components/ChessGameUI';
import MatchResultScreen from '../components/MatchResultScreen';

const GameRoomShell: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [reportingPlayer, setReportingPlayer] = useState<{ id: string, username: string } | null>(null);
  const [matchResult, setMatchResult] = useState<any>(null);

  const fetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      const data = await matchApi.getById(id);
      setMatch(data);
      if (data.status === 'finished' || data.status === 'cancelled') {
        // If finished, try to fetch result
        try {
          const result = await gameApi.getResult(id);
          setMatchResult(result);
        } catch (resErr) {
          console.error('Failed to fetch match result:', resErr);
        }
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
    
    // Heartbeat for presence
    const heartbeatInterval = setInterval(async () => {
      if (id) {
        try {
          await matchApi.updatePresence(id);
        } catch (err) {
          console.error('Heartbeat failed');
        }
      }
    }, 10000); // Every 10 seconds

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [fetchMatch, id]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await gameApi.leave(id!);
      navigate('/lobby');
    } catch (err: any) {
      alert(err.message);
      setLeaving(false);
      setShowLeaveConfirm(false);
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

  const totalParticipants = match.participants?.length || 0;
  const wagerAmount = match.game_request?.amount || 0;
  const totalPrizePool = totalParticipants * wagerAmount;

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
              <div className="text-xs font-black text-white">₦{totalPrizePool.toLocaleString()}</div>
              <div className="text-[8px] text-gray-500 uppercase tracking-widest">Prize Pool</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-white">{totalParticipants}</div>
              <div className="text-[8px] text-gray-500 uppercase tracking-widest">Players</div>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowLeaveConfirm(true)}
            disabled={leaving}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-red-500/20"
          >
            {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 border border-red-500/20">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">
                Leave Match?
              </h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to leave this active match? Leaving now will result in an <span className="text-red-400 font-bold">automatic defeat</span> and loss of your wager.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors border border-white/10"
                >
                  Stay
                </button>
                <button
                  onClick={handleLeave}
                  disabled={leaving}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                >
                  {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Leave Now'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Game Viewport */}
        <div className="flex-1 relative bg-black flex flex-col overflow-hidden">
          {/* Voice Chat Integrated Bar */}
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-center">
            <div className="w-full max-w-4xl">
              <VoiceChat matchId={id!} />
            </div>
          </div>
          
          {/* Game Engine UI */}
          <div className="flex-1 w-full overflow-y-auto flex items-start justify-center pt-8">
            {match.game_type?.name.toLowerCase().includes('dice') ? (
              <DiceGameUI 
                matchId={id!} 
                matchParticipants={match.participants}
                onGameEnd={(result) => setMatchResult(result)} 
              />
            ) : match.game_type?.name.toLowerCase().includes('chess') ? (
              <ChessGameUI
                matchId={id!}
                matchParticipants={match.participants}
                onGameEnd={(result) => setMatchResult(result)}
              />
            ) : (
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
            )}
          </div>

          {/* HUD Elements */}
          <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none">
            {/* Presence info will be moved to DiceGameUI */}
          </div>
        </div>

        {/* Sidebar (Chat/Log) */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/20 flex flex-col">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-widest text-white/60">Match Chat</span>
              </div>
            </div>
            <Chat 
              contextType="match" 
              contextId={id!} 
              className="flex-1 border-0 rounded-none bg-transparent" 
            />
          </div>

          <div className="h-48 border-t border-white/10 flex flex-col overflow-hidden bg-black/40">
            <div className="p-3 border-b border-white/10 flex items-center gap-2">
              <Shield className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Match Log</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              <div className="text-[9px] text-emerald-500/60 font-mono">
                [{new Date(match.started_at).toLocaleTimeString()}] Match started
              </div>
              {match.participants?.map((p) => (
                <div key={p.id} className="text-[9px] text-gray-600 font-mono">
                  [{new Date(p.joined_at).toLocaleTimeString()}] {p.users?.username} joined
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportingPlayer && (
          <ReportModal
            reportedId={reportingPlayer.id}
            reportedUsername={reportingPlayer.username}
            matchId={id}
            onClose={() => setReportingPlayer(null)}
          />
        )}
      </AnimatePresence>

      {/* Match Result Overlay */}
      <AnimatePresence>
        {matchResult && (
          <MatchResultScreen 
            result={matchResult} 
            onClose={() => setMatchResult(null)} 
            onExit={handleLeave}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameRoomShell;
