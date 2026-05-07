import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  User,
  Loader2,
  Dice6,
  ChevronRight,
  Shield,
  Flag
} from 'lucide-react';
import { gameApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';
import { MatchParticipant } from '../types/multiplayer';

interface Props {
  matchId: string;
  matchParticipants?: MatchParticipant[];
  onGameEnd: (result: any) => void;
}

// 15x15 grid mapping for the 52 common path squares
const COMMON_PATH_MAP = [
  { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 }, // Red start (0-4)
  { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 }, // Up (5-10)
  { r: 0, c: 7 }, // Middle top (11)
  { r: 0, c: 8 }, { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 }, // Down (12-17)
  { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 }, // Right (18-23)
  { r: 7, c: 14 }, // Middle right (24)
  { r: 8, c: 14 }, { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 }, // Left (25-30)
  { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 }, // Down (31-36)
  { r: 14, c: 7 }, // Middle bottom (37)
  { r: 14, c: 6 }, { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 }, // Up (38-43)
  { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 }, // Left (44-49)
  { r: 7, c: 0 }, // Middle left (50)
  { r: 6, c: 0 }, // Return to red (51)
];

// Home paths for each color
const HOME_PATHS: Record<string, {r: number, c: number}[]> = {
  red: [{r: 7, c: 1}, {r: 7, c: 2}, {r: 7, c: 3}, {r: 7, c: 4}, {r: 7, c: 5}],
  green: [{r: 1, c: 7}, {r: 2, c: 7}, {r: 3, c: 7}, {r: 4, c: 7}, {r: 5, c: 7}],
  yellow: [{r: 7, c: 13}, {r: 7, c: 12}, {r: 7, c: 11}, {r: 7, c: 10}, {r: 7, c: 9}],
  blue: [{r: 13, c: 7}, {r: 12, c: 7}, {r: 11, c: 7}, {r: 10, c: 7}, {r: 9, c: 7}],
};

// Base positions (for tokens at -1)
const BASE_POSITIONS: Record<string, {r: number, c: number}[]> = {
  red: [{r: 1, c: 1}, {r: 1, c: 4}, {r: 4, c: 1}, {r: 4, c: 4}],
  green: [{r: 1, c: 10}, {r: 1, c: 13}, {r: 4, c: 10}, {r: 4, c: 13}],
  yellow: [{r: 10, c: 10}, {r: 10, c: 13}, {r: 13, c: 10}, {r: 13, c: 13}],
  blue: [{r: 10, c: 1}, {r: 10, c: 4}, {r: 13, c: 1}, {r: 13, c: 4}],
};

const COLOR_MAP: Record<string, string> = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  blue: 'bg-blue-500'
};

const LudoGameUI: React.FC<Props> = ({ matchId, matchParticipants, onGameEnd }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const gameStateRef = useRef<any>(null);
  const onGameEndRef = useRef(onGameEnd);

  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  const fetchGameState = useCallback(async () => {
    try {
      const response = await gameApi.getState(matchId);
      setGameState(response.state);
      gameStateRef.current = response.state;

      if (response.status === 'completed' && response.state.game_over) {
        const result = await gameApi.getResult(matchId);
        onGameEndRef.current(result);
      }
    } catch (err: any) {
      if (!gameStateRef.current) {
        setError(err.message || 'Failed to fetch game state');
      }
      console.error('LUDO: Poll failed', err);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  const handleRollDie = async () => {
    if (moveLoading || rolling) return;
    setRolling(true);
    setMoveLoading(true);
    try {
      await gameApi.processMove(matchId, { type: 'roll_die' });
      await fetchGameState();
    } catch (err: any) {
      console.error('LUDO: Roll failed', err);
    } finally {
      setRolling(false);
      setMoveLoading(false);
    }
  };

  const handleMoveToken = async (tokenIndex: number) => {
    if (moveLoading || !gameState?.waitingForTokenMove) return;
    setMoveLoading(true);
    try {
      await gameApi.processMove(matchId, { type: 'move_token', tokenIndex });
      await fetchGameState();
      setSelectedTokenIndex(null);
    } catch (err: any) {
      console.error('LUDO: Move failed', err);
    } finally {
      setMoveLoading(false);
    }
  };

  if (loading && !gameState) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium">Initializing board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-white font-medium mb-2">{error}</p>
        <button onClick={() => window.location.reload()} className="text-blue-500 hover:underline">
          Reload game
        </button>
      </div>
    );
  }

  const isMyTurn = gameState?.currentTurnPlayerId === user?.id;
  const myParticipant = gameState?.participants.find((p: any) => p.userId === user?.id);
  const myColor = myParticipant?.color;

  const renderCell = (r: number, c: number) => {
    // Determine cell type for styling
    let cellStyle = "bg-zinc-800/10 border-[0.5px] border-zinc-700/50";
    
    // Check if in home base area
    if (r < 6 && c < 6) cellStyle = "bg-red-500/10 border-red-500/20";
    if (r < 6 && c >= 9) cellStyle = "bg-green-500/10 border-green-500/20";
    if (r >= 9 && c >= 9) cellStyle = "bg-yellow-500/10 border-yellow-500/20";
    if (r >= 9 && c < 6) cellStyle = "bg-blue-500/10 border-blue-500/20";

    // Goal
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cellStyle = "bg-zinc-900 border-none";

    // Home paths
    if (r === 7 && c >= 1 && c <= 5) cellStyle = "bg-red-500/30 border-red-500/20";
    if (c === 7 && r >= 1 && r <= 5) cellStyle = "bg-green-500/30 border-green-500/20";
    if (r === 7 && c >= 9 && c <= 13) cellStyle = "bg-yellow-500/30 border-yellow-500/20";
    if (c === 7 && r >= 9 && r <= 13) cellStyle = "bg-blue-500/30 border-blue-500/20";

    // Start squares
    if (r === 6 && c === 1) cellStyle = "bg-red-500 border-red-400 border-2";
    if (r === 1 && c === 8) cellStyle = "bg-green-500 border-green-400 border-2";
    if (r === 8 && c === 13) cellStyle = "bg-yellow-500 border-yellow-400 border-2";
    if (r === 13 && c === 6) cellStyle = "bg-blue-500 border-blue-400 border-2";

    return (
      <div 
        key={`${r}-${c}`}
        style={{ gridRow: r + 1, gridColumn: c + 1 }}
        className={`w-full aspect-square relative ${cellStyle}`}
      ></div>
    );
  };

  const getTokenPosition = (participantIdx: number, tokenIdx: number) => {
    const p = gameState.participants[participantIdx];
    const pos = p.tokens[tokenIdx];
    const color = p.color as string;

    if (pos === -1) {
      return BASE_POSITIONS[color][tokenIdx];
    }
    if (pos >= 56) {
      // Goal
      return { r: 7, c: 7 };
    }
    if (pos >= 51) {
      // Home path
      return HOME_PATHS[color][pos - 51];
    }
    
    // Common path
    // Need to find start square for each color to offset the common path index
    const starts: Record<string, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
    const realIdx = (starts[color] + pos) % 52;
    return COMMON_PATH_MAP[realIdx];
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 py-8 animate-in fade-in duration-500">
      {/* Board and Side Info */}
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full max-w-7xl justify-center">
        
        {/* Left Info / Active Players */}
        <div className="flex flex-col gap-4 w-full lg:w-72 order-2 lg:order-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-6">Participants</h3>
            <div className="space-y-4">
              {gameState.participants.map((p: any, idx: number) => (
                <div key={p.userId} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  gameState.currentTurnPlayerId === p.userId 
                    ? 'bg-zinc-800/80 border-blue-500/30 ring-1 ring-blue-500/20' 
                    : 'bg-transparent border-transparent opacity-60'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${COLOR_MAP[p.color]}`} />
                    <span className="text-sm font-medium text-white truncate max-w-[120px]">{p.username}</span>
                  </div>
                  {p.rank ? (
                    <div className="flex items-center gap-1 text-yellow-500 font-bold italic text-sm">
                      <Trophy className="w-3 h-3" /> #{p.rank}
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-zinc-500">{p.score}/4</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm font-medium">Your Turn</span>
                <div className={`w-2 h-2 rounded-full ${isMyTurn ? 'bg-green-500 animate-pulse' : 'bg-zinc-700'}`} />
             </div>
             
             {isMyTurn && !gameState.waitingForTokenMove && (
               <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRollDie}
                disabled={moveLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-colors"
               >
                 {moveLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Dice6 className="w-5 h-5" />}
                 Roll Die
               </motion.button>
             )}

             {gameState.dieValue && (
               <div className="flex flex-col items-center py-4 bg-zinc-800/50 rounded-2xl">
                 <span className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-tight">You rolled a</span>
                 <motion.div 
                   key={gameState.dieValue}
                   initial={{ scale: 0.5, rotate: -45 }}
                   animate={{ scale: 1.0, rotate: 0 }}
                   className="text-4xl font-black text-white"
                 >
                   {gameState.dieValue}
                 </motion.div>
                 {isMyTurn && gameState.waitingForTokenMove && (
                   <span className="text-[10px] text-blue-400 mt-2 font-bold uppercase animate-pulse">Select a token to move</span>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Board */}
        <div className="relative order-1 lg:order-2">
          <div className="bg-zinc-900 p-4 rounded-[40px] shadow-2xl border border-zinc-800">
            <div className="grid grid-cols-15 grid-rows-15 w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] relative">
              {/* Render background cells */}
              {Array.from({ length: 15 }).map((_, r) => 
                Array.from({ length: 15 }).map((_, c) => renderCell(r, c))
              )}

              {/* Goal Icons */}
              <div style={{ gridRow: '7/10', gridColumn: '7/10' }} className="flex items-center justify-center pointer-events-none">
                 <Trophy className="w-10 h-10 text-yellow-500/20" />
              </div>

              {/* Tokens */}
              {gameState.participants.map((p: any, pIdx: number) => (
                p.tokens.map((pos: number, tIdx: number) => {
                  const gridPos = getTokenPosition(pIdx, tIdx);
                  
                  // Improved overlap: offset tokens slightly based on their index
                  const offsetX = (tIdx % 2 === 0 ? -4 : 4);
                  const offsetY = (tIdx < 2 ? -4 : 4);
                  // Apply offset only at home base or goal as per Ludo style
                  const useOffset = pos === -1 || pos === 56;

                  const isSelectable = isMyTurn && gameState.waitingForTokenMove && p.userId === user?.id && pos < 56;
                  // Basic validation check (can move from base only on 6)
                  const canMove = p.userId === user?.id && (pos === -1 ? gameState.dieValue === 6 : (pos + gameState.dieValue <= 56));
                  
                  return (
                    <motion.div
                      key={`${p.userId}-${tIdx}`}
                      layout
                      initial={false}
                      transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                      style={{ 
                        gridRow: gridPos.r + 1, 
                        gridColumn: gridPos.c + 1,
                        transform: useOffset ? `translate(${offsetX}px, ${offsetY}px)` : 'none',
                        zIndex: isSelectable ? 40 : 20
                      }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelectable && canMove) handleMoveToken(tIdx);
                        }}
                        disabled={!isSelectable || !canMove}
                        className={`w-[80%] h-[80%] rounded-full shadow-lg border-2 border-white/20 transition-all pointer-events-auto flex items-center justify-center ${COLOR_MAP[p.color]} ${
                          isSelectable && canMove ? 'ring-4 ring-white animate-pulse scale-110 cursor-pointer' : ''
                        }`}
                      >
                         <div className="w-[40%] h-[40%] rounded-full bg-white/30" />
                      </button>
                    </motion.div>
                  );
                })
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="absolute -top-4 -right-4 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-xl hidden sm:block">
            <div className="flex gap-4">
               {['red', 'green', 'yellow', 'blue'].map(c => (
                 <div key={c} className="flex items-center gap-1">
                   <div className={`w-2 h-2 rounded-full ${COLOR_MAP[c]}`} />
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Right Info - History / Events */}
        <div className="w-full lg:w-72 order-3 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
           <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-6">Game Events</h3>
           <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pr-2">
             {gameState.history?.slice(-8).reverse().map((event: any, i: number) => (
                <div key={i} className="flex gap-3 text-xs">
                   <ChevronRight className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                   <span className="text-zinc-400">
                     {event.type === 'token_moved' && `Token moved to square ${event.newPos}`}
                     {event.type === 'capture' && `Capture by ${event.capturer}!`}
                     {event.type === 'rolled_die' && `Rolled a ${event.roll}`}
                   </span>
                </div>
             ))}
             {(!gameState.history || gameState.history.length === 0) && (
               <div className="text-zinc-600 text-xs italic">Waiting for moves...</div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default LudoGameUI;
