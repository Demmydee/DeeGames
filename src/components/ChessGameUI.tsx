import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Clock, 
  Hand, 
  Flag, 
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  Shield,
  Loader2
} from 'lucide-react';
import { gameApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';
import { MatchParticipant } from '../types/multiplayer';

interface Props {
  matchId: string;
  matchParticipants?: MatchParticipant[];
  onGameEnd: (result: any) => void;
}

const ChessGameUI: React.FC<Props> = ({ matchId, matchParticipants, onGameEnd }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [promotionSquare, setPromotionSquare] = useState<string | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: string, to: string } | null>(null);
  const [drawOfferStatus, setDrawOfferStatus] = useState<'none' | 'offering' | 'received' | 'sent'>('none');

  const fetchGameState = useCallback(async () => {
    if (skipPollRef.current) return;
    try {
      const state = await gameApi.getState(matchId);
      if (skipPollRef.current) return; // Re-check after async
      setGameState(state.state);

      if (state.status === 'completed' && state.state.game_over) {
        const result = await gameApi.getResult(matchId);
        onGameEnd(result);
      }

      // Check for draw offers in the state or via another endpoint?
      // For now, let's assume it's in the state's draw_offer_by field
      if (state.state.draw_offer_by) {
         if (state.state.draw_offer_by === user?.id) {
           setDrawOfferStatus('sent');
         } else {
           setDrawOfferStatus('received');
         }
      } else {
        setDrawOfferStatus('none');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch game state');
    } finally {
      setLoading(false);
    }
  }, [matchId, onGameEnd, user?.id]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  const skipPollRef = React.useRef(false);

  const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    console.log('CHESS: onDrop triggered', { sourceSquare, targetSquare, piece });

    if (gameState.status !== 'active') {
      console.warn('CHESS: Move rejected - game not active', gameState.status);
      return false;
    }

    if (gameState.currentTurnPlayerId !== user?.id) {
      console.warn('CHESS: Move rejected - not your turn', { turn: gameState.currentTurnPlayerId, user: user?.id });
      return false;
    }

    // Only allow moving own pieces
    const isPlayerWhite = gameState.white_user_id === user?.id;
    console.log('CHESS: Player perspective', { isPlayerWhite, userId: user?.id, whiteId: gameState.white_user_id });

    if (isPlayerWhite && piece[0] !== 'w') {
      console.warn('CHESS: Move rejected - tried to move black piece as white player');
      return false;
    }
    if (!isPlayerWhite && piece[0] !== 'b') {
      console.warn('CHESS: Move rejected - tried to move white piece as black player');
      return false;
    }

    // Check for promotion
    const chess = new Chess(gameState.fen);
    const moves = chess.moves({ verbose: true });
    const isPromotion = moves.some(m => m.from === sourceSquare && m.to === targetSquare && m.flags.includes('p'));

    if (isPromotion) {
      console.log('CHESS: Promotion detected');
      setPromotionMove({ from: sourceSquare, to: targetSquare });
      setPromotionSquare(targetSquare);
      return true;
    }

    // Validate move locally with chess.js
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare
      });

      if (move === null) {
        console.warn('CHESS: Move rejected by chess.js (invalid move or FEN mismatch)', {
          fen: gameState.fen,
          from: sourceSquare,
          to: targetSquare
        });
        return false;
      }

      console.log('CHESS: Move validated locally', move.san);

      // Optimistic update
      const newFen = chess.fen();
      setGameState((prev: any) => ({ ...prev, fen: newFen }));

      // Prevent polling from overwriting our optimistic state for a bit
      skipPollRef.current = true;

      // Process move in background
      (async () => {
        try {
          setMoveLoading(true);
          console.log('CHESS: Sending move to server...');
          await gameApi.processMove(matchId, {
            from: sourceSquare,
            to: targetSquare,
            type: 'move'
          });
          console.log('CHESS: Move accepted by server');

          // Allow poll again after a small delay to ensure server has updated
          setTimeout(() => {
            skipPollRef.current = false;
            fetchGameState();
          }, 1000);
        } catch (err: any) {
          console.error('CHESS: Server rejected move', err);
          setError(err.message);
          skipPollRef.current = false;
          fetchGameState(); // Revert
        } finally {
          setMoveLoading(false);
        }
      })();

      return true;
    } catch (err) {
      console.error('CHESS: Error during local validation', err);
      return false;
    }
  };

  const handlePromotion = async (pieceType: string) => {
    if (!promotionMove) return;
    try {
      setMoveLoading(true);
      console.log('CHESS: Sending promotion move to server...', pieceType);
      await gameApi.processMove(matchId, {
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: pieceType,
        type: 'move'
      });
      setPromotionMove(null);
      setPromotionSquare(null);
      fetchGameState();
    } catch (err: any) {
      console.error('CHESS: Server rejected promotion move', err);
      setError(err.message);
    } finally {
      setMoveLoading(false);
    }
  };

  const handleDrawOffer = async () => {
    if (!matchId) return;
    try {
      console.log('CHESS: Offering draw via API...');
      await gameApi.createDrawOffer(matchId);
      console.log('CHESS: Draw offer successfully created');
      setDrawOfferStatus('sent');
    } catch (err: any) {
      console.error('CHESS: Draw offer error detail:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDrawResponse = async (accept: boolean) => {
    try {
      if (accept) {
        await gameApi.acceptDrawOffer(matchId);
      } else {
        await gameApi.declineDrawOffer(matchId);
      }
      fetchGameState();
    } catch (err: any) {
      console.error('Draw response error:', err);
      setError(err.response?.data?.error || err.message);
    }
  };

  const isWhite = gameState?.white_user_id === user?.id;
  const boardOrientation = isWhite ? 'white' : 'black';

  // Live Clocks
  const [clocks, setClocks] = useState({ white: 0, black: 0 });

  useEffect(() => {
    if (!gameState || gameState.status !== 'active') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const turnStartedAt = new Date(gameState.turn_started_at).getTime();
      const elapsed = now - turnStartedAt;

      const isWhiteTurn = gameState.currentTurnPlayerId === gameState.white_user_id;

      setClocks({
        white: isWhiteTurn ? Math.max(0, gameState.white_time_remaining_ms - elapsed) : gameState.white_time_remaining_ms,
        black: !isWhiteTurn ? Math.max(0, gameState.black_time_remaining_ms - elapsed) : gameState.black_time_remaining_ms
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameState]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const opponent = useMemo(() => {
    return matchParticipants?.find(p => p.user_id !== user?.id);
  }, [matchParticipants, user?.id]);

  if (!gameState) {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Game Error</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => fetchGameState()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const whitePlayer = matchParticipants?.find(p => p.user_id === gameState?.white_user_id);
  const blackPlayer = matchParticipants?.find(p => p.user_id === gameState?.black_user_id);

  const getClockColor = (ms: number) => {
    if (ms < 10000) return 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse';
    if (ms < 30000) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-stretch gap-6 px-6 max-w-7xl mx-auto overflow-y-auto pb-8">
      {/* Left Column: Player Info & Chess Board */}
      <div className="flex-[2] flex flex-col gap-4">
        {/* Opponent Info (Top) */}
        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${boardOrientation === 'white' ? 'bg-zinc-800 text-white' : 'bg-white text-black'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Opponent</div>
              <div className="text-sm font-black text-white uppercase italic">{opponent?.users?.username || 'Opponent'}</div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl border border-white/10 font-mono font-bold text-xl ${getClockColor(boardOrientation === 'white' ? clocks.black : clocks.white)}`}>
            {formatTime(boardOrientation === 'white' ? clocks.black : clocks.white)}
          </div>
        </div>

        {/* Board Container */}
        <div
          className="relative aspect-square w-full max-w-[600px] mx-auto bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border-4 border-zinc-800"
          style={{ touchAction: 'none' }}
        >
          <Chessboard
            id="main-chess-board"
            position={gameState?.fen || 'start'}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            customDarkSquareStyle={{ backgroundColor: '#1a1a1a' }}
            customLightSquareStyle={{ backgroundColor: '#2a2a2a' }}
            customBoardStyle={{ touchAction: 'none' }}
            animationDuration={200}
            arePiecesDraggable={gameState?.status === 'active' && gameState?.currentTurnPlayerId === user?.id}
          />

          {/* Promotion Overlay */}
          <AnimatePresence>
            {promotionSquare && (
              <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-zinc-900 border border-white/10 p-6 rounded-3xl shadow-2xl text-center max-w-sm w-full"
                >
                  <h3 className="text-lg font-black text-white uppercase italic mb-6">Promote Pawn</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {['q', 'r', 'b', 'n'].map((p) => (
                      <button
                        key={p}
                        onClick={() => handlePromotion(p)}
                        className="aspect-square flex items-center justify-center bg-white/5 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/50 rounded-2xl transition-all"
                      >
                         <img
                           src={`https://chessboardjs.com/img/chesspieces/wikipedia/${boardOrientation[0]}${p.toUpperCase()}.png`}
                           alt={p}
                           className="w-12 h-12"
                         />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { setPromotionSquare(null); setPromotionMove(null); }}
                    className="mt-6 text-xs text-gray-500 hover:text-white uppercase font-bold tracking-widest"
                  >
                    Cancel
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Turn Indicator */}
          {gameState?.status === 'active' && (
            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border ${
              gameState?.currentTurnPlayerId === user?.id
                ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                : 'bg-zinc-800 text-gray-500 border-zinc-700'
            }`}>
              {gameState?.currentTurnPlayerId === user?.id ? 'Your Turn' : "Opponent's Turn"}
            </div>
          )}
        </div>

        {/* Self Info (Bottom) */}
        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${boardOrientation === 'white' ? 'bg-white text-black' : 'bg-zinc-800 text-white'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">You ({boardOrientation})</div>
              <div className="text-sm font-black text-white uppercase italic">{user?.username}</div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl border border-white/10 font-mono font-bold text-xl ${getClockColor(boardOrientation === 'white' ? clocks.white : clocks.black)}`}>
            {formatTime(boardOrientation === 'white' ? clocks.white : clocks.black)}
          </div>
        </div>
      </div>

      {/* Right Column: Game Stats & Actions */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Match Info Card */}
        <div className="p-6 bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-3xl shadow-xl">
          <div className="flex items-center gap-2 text-emerald-500 mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Match Summary</span>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Format</span>
              <span className="text-xs text-white font-black uppercase tracking-widest italic flex items-center gap-2">
                <RotateCcw className="w-3 h-3 text-emerald-500" />
                {gameState?.variant}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Moves</span>
              <span className="text-xs text-white font-black">{Math.ceil((gameState?.move_count || 0) / 2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Last Move</span>
              <span className="text-xs text-emerald-400 font-bold font-mono">
                {gameState?.last_move ? `${gameState.last_move.san}` : '--'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 grid grid-cols-1 gap-3">
             {drawOfferStatus === 'received' ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-3">Draw Offer Received</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDrawResponse(true)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDrawResponse(false)}
                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
             ) : (
                <button
                  onClick={handleDrawOffer}
                  disabled={drawOfferStatus === 'sent' || gameState?.status !== 'active'}
                  className="flex items-center justify-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-all border border-white/10 disabled:opacity-50"
                >
                  <Hand className="w-4 h-4" />
                  {drawOfferStatus === 'sent' ? 'Draw Offered...' : 'Offer Draw'}
                </button>
             )}
          </div>
        </div>

        {/* History / Log */}
        <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
             <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 flex items-center gap-2">
               < ChevronRight className="w-3 h-3" />
               Move History
             </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono scrollbar-hide">
            {gameState?.history?.map((h: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 text-[10px]">
                <span className="w-6 text-gray-600">{Math.floor(idx / 2) + 1}.</span>
                <span className={`flex-1 ${h.player === 'white' ? 'text-white' : 'text-gray-400'}`}>
                  {h.move}
                </span>
                <span className="text-[8px] text-gray-700">{new Date(h.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            ))}
            {gameState?.history?.length === 0 && (
              <div className="text-center py-8 text-gray-600 text-[10px] uppercase tracking-widest">
                Waiting for first move...
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-6 right-6 p-4 bg-red-950/40 backdrop-blur-xl border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-right max-w-sm z-50">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-xs text-red-200">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-white/5 rounded">
            <RotateCcw className="w-3 h-3 text-red-400" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ChessGameUI;
