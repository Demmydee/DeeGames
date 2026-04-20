import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dices, 
  Trophy, 
  AlertCircle, 
  Loader2, 
  TrendingUp, 
  UserMinus,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight
} from 'lucide-react';
import { gameApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';
import { MatchParticipant } from '../types/multiplayer';

interface Props {
  matchId: string;
  matchParticipants?: MatchParticipant[];
  onGameEnd: (result: any) => void;
}

const DiceGameUI: React.FC<Props> = ({ matchId, matchParticipants, onGameEnd }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const state = await gameApi.getState(matchId);
      setGameState(state.state);
      if (state.status === 'completed') {
        const result = await gameApi.getResult(matchId);
        onGameEnd(result);
      }
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Silently wait for initialization
        console.warn('Game state not yet available, retrying...');
      } else {
        console.error('Failed to fetch game state:', err);
        setError('Connection lost. Retrying...');
      }
    } finally {
      setLoading(false);
    }
  }, [matchId, onGameEnd]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);

    // Heartbeat
    const hbInterval = setInterval(async () => {
      try {
        await gameApi.heartbeat(matchId);
      } catch (err) {
        console.error('Game heartbeat failed');
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      clearInterval(hbInterval);
    };
  }, [fetchState, matchId]);

  const handleRoll = async () => {
    if (rolling) return;
    setRolling(true);
    setError(null);
    try {
      const moveType = gameState.tieBreaker?.playerIds.includes(user?.id)
        ? (gameState.variant === 'sudden_drop' ? 'tie_reroll' : 'sudden_death_roll')
        : 'roll';

      await gameApi.move(matchId, { type: moveType });
      await fetchState();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRolling(false);
    }
  };

  if (loading && !gameState) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing Game State...</p>
      </div>
    );
  }

  const hasRolled = gameState.rolls[user?.id!] !== undefined && gameState.rolls[user?.id!] !== null;
  const isTieBreaker = gameState.tieBreaker?.playerIds.includes(user?.id);
  const hasTieRolled = isTieBreaker && gameState.tieBreaker.rolls[user?.id!] !== undefined && gameState.tieBreaker.rolls[user?.id!] !== null;

  const isMyTurn = gameState.currentTurnPlayerId === user?.id;
  const currentTurnPlayer = gameState.participants.find((p: any) => p.userId === gameState.currentTurnPlayerId);

  // Determine what roll to show
  const currentRoll = isTieBreaker ? gameState.tieBreaker.rolls[user?.id!] : gameState.rolls[user?.id!];
  const lastRoll = gameState.lastRoundResults?.[user?.id!];
  const displayRoll = currentRoll !== undefined && currentRoll !== null ? currentRoll : (Object.keys(gameState.rolls).length === 0 ? lastRoll : null);
  const hasDisplayRoll = displayRoll !== undefined && displayRoll !== null;

  const canRoll = gameState.status === 'active' &&
                 isMyTurn &&
                 gameState.activePlayerIds.includes(user?.id) &&
                 (!hasRolled || (isTieBreaker && !hasTieRolled));

  return (
    <div className="w-full max-w-4xl mx-auto p-6 flex flex-col gap-8">
      {/* Game Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Dices className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
              {gameState.variant === 'sudden_drop' ? 'Sudden Drop' : 'Marathon'}
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
              Round {gameState.currentRound} of {gameState.totalRounds}
            </p>
          </div>
        </div>

        {gameState.status === 'active' && gameState.currentTurnPlayerId && (
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-black uppercase italic text-emerald-400 tracking-tight">
              {isMyTurn ? "IT'S YOUR TURN TO ROLL!" : `WAITING FOR ${currentTurnPlayer?.username?.toUpperCase()}`}
            </span>
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Players List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Participants</h3>
          {gameState.participants.map((p: any) => {
            const presence = matchParticipants?.find(mp => mp.user_id === p.userId);
            const isCurrentTurn = gameState.currentTurnPlayerId === p.userId;

            return (
              <div
                key={p.userId}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  isCurrentTurn
                    ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : p.status === 'active'
                      ? 'bg-white/5 border-white/10'
                      : 'bg-red-500/5 border-red-500/20 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] relative ${
                    p.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {p.username.substring(0, 2).toUpperCase()}
                    {presence?.is_away && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-black" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs font-bold text-white leading-tight">{p.username}</div>
                      {isCurrentTurn && <ArrowRight className="w-3 h-3 text-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`text-[8px] uppercase tracking-widest ${presence?.is_away ? 'text-orange-400' : 'text-gray-500'}`}>
                        {presence?.is_away ? 'Away' : p.status}
                      </div>
                      {presence?.is_away && presence.away_since && (
                        <div className="text-[8px] font-mono text-orange-500 font-bold">
                          {Math.max(0, 300 - Math.floor((Date.now() - new Date(presence.away_since).getTime()) / 1000))}s
                        </div>
                      )}
                      {p.rank && (
                        <div className="text-[8px] px-1 bg-white/10 text-gray-400 rounded">Rank {p.rank}</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-white">{p.score.toFixed(0)}</div>
                  <div className="text-[8px] text-gray-500 uppercase tracking-widest leading-none mt-0.5">Score</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Dice Display */}
          <div className="aspect-video bg-black/40 border border-white/5 rounded-3xl flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            <AnimatePresence mode="wait">
              {hasDisplayRoll ? (
                <motion.div
                  key="roll-result"
                  initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10 mb-4">
                    <span className="text-5xl font-black text-black">
                      {displayRoll}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                    {Object.keys(gameState.rolls).length === 0 && lastRoll ? "Last Round Roll" : "You Rolled!"}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="roll-prompt"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <Dices className={`w-20 h-20 mx-auto mb-4 text-white/20 ${canRoll ? 'animate-bounce' : ''}`} />
                  <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">
                    {canRoll ? 'Your Turn to Roll' : isMyTurn ? 'Rolling...' : `Waiting for ${currentTurnPlayer?.username}`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tie Breaker Overlay */}
            {gameState.tieBreaker && (
              <div className="absolute top-4 left-4 right-4 p-3 bg-orange-500/20 border border-orange-500/40 rounded-xl backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Tie Breaker Active</span>
                </div>
                <div className="flex -space-x-2">
                  {gameState.tieBreaker.playerIds.map((id: string) => (
                    <div key={id} className="w-6 h-6 rounded-full bg-orange-600 border-2 border-black flex items-center justify-center text-[8px] font-bold">
                      {gameState.participants.find((p: any) => p.userId === id)?.username.substring(0, 1).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Roll Button */}
          <button
            onClick={handleRoll}
            disabled={!canRoll || rolling}
            className={`w-full py-6 rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
              canRoll 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20' 
                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
            }`}
          >
            {rolling ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Zap className={`w-6 h-6 ${canRoll ? 'text-yellow-400' : ''}`} />
                <span>{isTieBreaker ? 'Re-Roll Tie' : 'Roll Dice'}</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold uppercase tracking-tight">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Round Status */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Round Status</h4>
            <div className="flex flex-wrap gap-2">
              {gameState.activePlayerIds.map((id: string) => {
                const p = gameState.participants.find((p: any) => p.userId === id);
                const rolled = gameState.rolls[id] !== undefined && gameState.rolls[id] !== null;
                return (
                  <div 
                    key={id}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                      rolled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-500'
                    }`}
                  >
                    {rolled ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3 animate-pulse" />}
                    {p?.username}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiceGameUI;
