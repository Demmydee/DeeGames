import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  // ✅ FIX 1: ALL refs declared at top, before any useEffect or callbacks
  const skipPollRef = useRef(false);
  const gameStateRef = useRef<any>(null); // ✅ FIX 4: ref for use inside callbacks
  const onGameEndRef = useRef(onGameEnd);


  /* Prevent touch scroll interference with chess board dragging */
  #main-chess-board,
  #main-chess-board * {
    touch-action: none !important;
    user-select: none !important;
    -webkit-user-select: none !important;
  }

  /* Fix for react-chessboard piece dragging on touch devices */
  [data-piece] {
    touch-action: none !important;
    cursor: grab !important;
  }

  [data-piece]:active {
    cursor: grabbing !important;
  }


  // Keep onGameEndRef current without causing re-renders
  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [promotionSquare, setPromotionSquare] = useState<string | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: string, to: string } | null>(null);
  const [drawOfferStatus, setDrawOfferStatus] = useState<
    'none' | 'offering' | 'received' | 'sent'
  >('none');
  const [clocks, setClocks] = useState({ white: 0, black: 0 });

  // ✅ FIX 2: Setter that also keeps ref in sync
  const setGameStateAndRef = useCallback((stateOrUpdater: any) => {
    if (typeof stateOrUpdater === 'function') {
      setGameState((prev: any) => {
        const next = stateOrUpdater(prev);
        gameStateRef.current = next;
        return next;
      });
    } else {
      gameStateRef.current = stateOrUpdater;
      setGameState(stateOrUpdater);
    }
  }, []);

  // ✅ FIX 3: fetchGameState uses ref to check skip,
  //           and does NOT overwrite state while we're in optimistic mode
  const fetchGameState = useCallback(async () => {
    // Check BEFORE the async call to avoid race conditions
    if (skipPollRef.current) {
      console.log('CHESS: Skipping poll (optimistic update in progress)');
      return;
    }

    try {
      const response = await gameApi.getState(matchId);

      // Check AGAIN after the async call completes
      if (skipPollRef.current) {
        console.log('CHESS: Discarding poll result (optimistic update in progress)');
        return;
      }

      const newState = response.state;
      setGameStateAndRef(newState);

      // Handle draw offer state
      if (newState.draw_offer_by) {
        setDrawOfferStatus(
          newState.draw_offer_by === user?.id ? 'sent' : 'received'
        );
      } else {
        setDrawOfferStatus('none');
      }

      // Handle game completion
      if (response.status === 'completed' && newState.game_over) {
        try {
          const result = await gameApi.getResult(matchId);
          onGameEndRef.current(result);
        } catch (err) {
          console.error('CHESS: Failed to fetch result', err);
        }
      }
    } catch (err: any) {
      // Don't show error during normal polling — only on initial load
      if (!gameStateRef.current) {
        setError(err.message || 'Failed to fetch game state');
      }
      console.error('CHESS: Poll failed', err);
    } finally {
      setLoading(false);
    }
  }, [matchId, user?.id, setGameStateAndRef]);

  // ✅ Single polling effect
  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  // ✅ FIX 5: Reliable optimistic skip with cleanup
  const doSkipPoll = useCallback((durationMs: number) => {
    skipPollRef.current = true;
    setTimeout(() => {
      skipPollRef.current = false;
    }, durationMs);
  }, []);

  // ✅ FIX 4: onDrop uses gameStateRef to avoid stale closure
  const onDrop = useCallback((
    sourceSquare: string,
    targetSquare: string,
    piece: string
  ): boolean => {
    // Read from ref — always has the latest value
    const gs = gameStateRef.current;

    if (!gs) {
      console.warn('CHESS: No game state available');
      return false;
    }

    if (gs.status !== 'active') {
      console.warn('CHESS: Move rejected - game not active', gs.status);
      return false;
    }

    if (gs.currentTurnPlayerId !== user?.id) {
      console.warn('CHESS: Move rejected - not your turn', {
        turn: gs.currentTurnPlayerId,
        user: user?.id
      });
      return false;
    }

    // Validate own piece
    const isPlayerWhite = gs.white_user_id === user?.id;
    if (isPlayerWhite && piece[0] !== 'w') {
      console.warn('CHESS: Tried to move black piece as white');
      return false;
    }
    if (!isPlayerWhite && piece[0] !== 'b') {
      console.warn('CHESS: Tried to move white piece as black');
      return false;
    }

    // Validate FEN before creating Chess instance
    if (!gs.fen) {
      console.warn('CHESS: No FEN in game state');
      return false;
    }

    let chess: Chess;
    try {
      chess = new Chess(gs.fen);
    } catch (err) {
      console.error('CHESS: Invalid FEN', gs.fen, err);
      return false;
    }

    // Check for promotion
    const moves = chess.moves({ verbose: true });
    const isPromotion = moves.some(
      (m) =>
        m.from === sourceSquare &&
        m.to === targetSquare &&
        m.flags.includes('p')
    );

    if (isPromotion) {
      console.log('CHESS: Promotion detected - showing dialog');
      setPromotionMove({ from: sourceSquare, to: targetSquare });
      setPromotionSquare(targetSquare);
      // ✅ Return true so piece stays on target square visually
      // The actual server call happens after user picks promotion piece
      return true;
    }

    // Validate move locally
    let moveResult;
    try {
      moveResult = chess.move({ from: sourceSquare, to: targetSquare });
    } catch (err) {
      console.error('CHESS: chess.js threw during move validation', err);
      return false;
    }

    if (moveResult === null) {
      console.warn('CHESS: Invalid move rejected by chess.js', {
        fen: gs.fen,
        from: sourceSquare,
        to: targetSquare,
      });
      return false;
    }

    console.log('CHESS: Move validated locally:', moveResult.san);

    // ✅ Snapshot the FEN before optimistic update (for rollback)
    const previousFen = gs.fen;
    const newFen = chess.fen();

    // ✅ Optimistic update
    setGameStateAndRef((prev: any) => ({
      ...prev,
      fen: newFen,
      // Optimistically flip the turn so UI is responsive
      currentTurnPlayerId:
        prev.currentTurnPlayerId === prev.white_user_id
          ? prev.black_user_id
          : prev.white_user_id,
    }));

    // ✅ Block polling for 3 seconds (covers server round-trip + 1s buffer)
    doSkipPoll(3000);

    // Send to server asynchronously
    (async () => {
      try {
        setMoveLoading(true);
        console.log('CHESS: Sending move to server...');

        await gameApi.processMove(matchId, {
          from: sourceSquare,
          to: targetSquare,
          type: 'move',
        });

        console.log('CHESS: Server accepted move');

        // Re-enable polling and fetch fresh state
        skipPollRef.current = false;
        await fetchGameState();
      } catch (err: any) {
        console.error('CHESS: Server rejected move - rolling back', err);

        // ✅ Rollback optimistic update
        setGameStateAndRef((prev: any) => ({
          ...prev,
          fen: previousFen,
          currentTurnPlayerId: gs.currentTurnPlayerId,
        }));

        setError(
          err.response?.data?.error ||
          err.message ||
          'Move rejected by server'
        );

        skipPollRef.current = false;
        await fetchGameState();
      } finally {
        setMoveLoading(false);
      }
    })();

    // ✅ Return true synchronously — piece stays where dropped
    return true;
  }, [
    user?.id,
    matchId,
    fetchGameState,
    setGameStateAndRef,
    doSkipPoll,
  ]);

  const handlePromotion = useCallback(async (pieceType: string) => {
    if (!promotionMove) return;

    const gs = gameStateRef.current;
    const previousFen = gs?.fen;

    try {
      setMoveLoading(true);
      console.log('CHESS: Sending promotion to server:', pieceType);

      // Optimistically apply promotion locally
      if (gs?.fen) {
        try {
          const chess = new Chess(gs.fen);
          chess.move({
            from: promotionMove.from,
            to: promotionMove.to,
            promotion: pieceType,
          });
          setGameStateAndRef((prev: any) => ({
            ...prev,
            fen: chess.fen(),
          }));
        } catch (e) {
          // If local validation fails, server will handle it
        }
      }

      setPromotionMove(null);
      setPromotionSquare(null);

      doSkipPoll(3000);

      await gameApi.processMove(matchId, {
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: pieceType,
        type: 'move',
      });

      skipPollRef.current = false;
      await fetchGameState();
    } catch (err: any) {
      console.error('CHESS: Promotion rejected', err);

      // Rollback
      if (previousFen) {
        setGameStateAndRef((prev: any) => ({ ...prev, fen: previousFen }));
      }
      setError(err.response?.data?.error || err.message);
      skipPollRef.current = false;
      await fetchGameState();
    } finally {
      setMoveLoading(false);
    }
  }, [promotionMove, matchId, fetchGameState, setGameStateAndRef, doSkipPoll]);

  const handleDrawOffer = useCallback(async () => {
    try {
      await gameApi.createDrawOffer(matchId);
      setDrawOfferStatus('sent');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  }, [matchId]);

  const handleDrawResponse = useCallback(async (accept: boolean) => {
    try {
      if (accept) {
        await gameApi.acceptDrawOffer(matchId);
      } else {
        await gameApi.declineDrawOffer(matchId);
      }
      fetchGameState();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  }, [matchId, fetchGameState]);

  // Live clocks
  useEffect(() => {
    if (!gameState || gameState.status !== 'active') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const turnStartedAt = new Date(gameState.turn_started_at).getTime();
      const elapsed = now - turnStartedAt;
      const isWhiteTurn = gameState.currentTurnPlayerId === gameState.white_user_id;

      setClocks({
        white: isWhiteTurn
          ? Math.max(0, gameState.white_time_remaining_ms - elapsed)
          : gameState.white_time_remaining_ms,
        black: !isWhiteTurn
          ? Math.max(0, gameState.black_time_remaining_ms - elapsed)
          : gameState.black_time_remaining_ms,
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameState]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getClockColor = (ms: number): string => {
    if (ms < 10000) return 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse';
    if (ms < 30000) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  };

  const isWhite = gameState?.white_user_id === user?.id;
  const boardOrientation = isWhite ? 'white' : 'black';

  const opponent = useMemo(() => {
    return matchParticipants?.find((p) => p.user_id !== user?.id);
  }, [matchParticipants, user?.id]);

  const whitePlayer = matchParticipants?.find(
    (p) => p.user_id === gameState?.white_user_id
  );
  const blackPlayer = matchParticipants?.find(
    (p) => p.user_id === gameState?.black_user_id
  );

  // ─── Loading / Error states ───────────────────────────────────────────────

  if (loading && !gameState) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Game Error</h3>
        <p className="text-gray-400 mb-6">{error || 'Unable to load game state.'}</p>
        <button
          onClick={fetchGameState}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col md:flex-row items-stretch gap-6 px-6 max-w-7xl mx-auto overflow-y-auto pb-8">

      {/* Left Column */}
      <div className="flex-[2] flex flex-col gap-4">

        {/* Opponent Info */}
        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              boardOrientation === 'white' ? 'bg-zinc-800 text-white' : 'bg-white text-black'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">
                Opponent
              </div>
              <div className="text-sm font-black text-white uppercase italic">
                {opponent?.users?.username || 'Opponent'}
              </div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl border border-white/10 font-mono font-bold text-xl ${
            getClockColor(boardOrientation === 'white' ? clocks.black : clocks.white)
          }`}>
            {formatTime(boardOrientation === 'white' ? clocks.black : clocks.white)}
          </div>
        </div>

        {/* Board */}
        <div
          className="relative aspect-square w-full max-w-[600px] mx-auto bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border-4 border-zinc-800"
          style={{
            touchAction: 'none',  // This MUST be on the container
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          // Prevent ALL touch scroll propagation from this element
          onTouchStart={(e) => { e.stopPropagation(); }}
          onTouchMove={(e) => { e.stopPropagation(); }}
        >
          <Chessboard
            id="main-chess-board"
            position={gameState?.fen || 'start'}
            onPieceDrop={onDrop}
            boardOrientation={boardOrientation}
            customDarkSquareStyle={{ backgroundColor: '#1a1a1a' }}
            customLightSquareStyle={{ backgroundColor: '#2a2a2a' }}
            customBoardStyle={{
              touchAction: 'none',   // Also on the board itself
              userSelect: 'none',
            }}
            animationDuration={200}
            arePiecesDraggable={
              !moveLoading &&
              gameState?.status === 'active' &&
              gameState?.currentTurnPlayerId === user?.id
            }
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
                  <h3 className="text-lg font-black text-white uppercase italic mb-6">
                    Promote Pawn
                  </h3>
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
                    onClick={() => {
                      setPromotionSquare(null);
                      setPromotionMove(null);
                    }}
                    className="mt-6 text-xs text-gray-500 hover:text-white uppercase font-bold tracking-widest"
                  >
                    Cancel
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Move Loading Overlay */}
          <AnimatePresence>
            {moveLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
              >
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              </motion.div>
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

        {/* Self Info */}
        <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              boardOrientation === 'white' ? 'bg-white text-black' : 'bg-zinc-800 text-white'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">
                You ({boardOrientation})
              </div>
              <div className="text-sm font-black text-white uppercase italic">
                {user?.username}
              </div>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl border border-white/10 font-mono font-bold text-xl ${
            getClockColor(boardOrientation === 'white' ? clocks.white : clocks.black)
          }`}>
            {formatTime(boardOrientation === 'white' ? clocks.white : clocks.black)}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col gap-6">
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
              <span className="text-xs text-white font-black">
                {Math.ceil((gameState?.move_count || 0) / 2)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-white/5">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Last Move</span>
              <span className="text-xs text-emerald-400 font-bold font-mono">
                {gameState?.last_move ? `${gameState.last_move.san}` : '--'}
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3">
            {drawOfferStatus === 'received' ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-3">
                  Draw Offer Received
                </div>
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

        {/* Move History */}
        <div className="flex-1 bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 flex items-center gap-2">
              <ChevronRight className="w-3 h-3" />
              Move History
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono scrollbar-hide">
            {gameState?.history?.length > 0 ? (
              gameState.history.map((h: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 text-[10px]">
                  <span className="w-6 text-gray-600">{Math.floor(idx / 2) + 1}.</span>
                  <span className={`flex-1 ${h.player === 'white' ? 'text-white' : 'text-gray-400'}`}>
                    {h.move}
                  </span>
                  <span className="text-[8px] text-gray-700">
                    {new Date(h.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-600 text-[10px] uppercase tracking-widest">
                Waiting for first move...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Toast */}
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