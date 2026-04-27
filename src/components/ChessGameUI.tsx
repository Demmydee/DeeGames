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

  const skipPollRef = useRef(false);
  const gameStateRef = useRef<any>(null);
  const onGameEndRef = useRef(onGameEnd);

  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  const [gameState, setGameState] = useState<any>(null);
  const [boardPosition, setBoardPosition] = useState<string>('start');
  const [lastFenSource, setLastFenSource] = useState<string>('initial');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [promotionSquare, setPromotionSquare] = useState<string | null>(null);
  const [promotionMove, setPromotionMove] = useState<{ from: string, to: string } | null>(null);
  const [drawOfferStatus, setDrawOfferStatus] = useState<'none' | 'offering' | 'received' | 'sent'>('none');
  const [clocks, setClocks] = useState({ white: 0, black: 0 });
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const setGameStateAndRef = useCallback((stateOrUpdater: any, source: string = 'unknown') => {
    if (typeof stateOrUpdater === 'function') {
      setGameState((prev: any) => {
        const next = stateOrUpdater(prev);
        gameStateRef.current = next;
        if (!skipPollRef.current && next?.fen) {
          if (source !== 'poll') {
            console.log(`DIAG: setGameStateAndRef updating board from ${source}. FEN: ${next.fen.substring(0, 30)}...`);
          }
          setBoardPosition(next.fen);
          setLastFenSource(source);
        } else if (skipPollRef.current) {
          console.log(`DIAG: setGameStateAndRef SKIPPING board sync from ${source} (poll skipped)`);
        }
        return next;
      });
    } else {
      gameStateRef.current = stateOrUpdater;
      setGameState(stateOrUpdater);
      if (!skipPollRef.current && stateOrUpdater?.fen) {
        if (source !== 'poll') {
          console.log(`DIAG: setGameStateAndRef updating board from ${source}. FEN: ${stateOrUpdater.fen.substring(0, 30)}...`);
        }
        setBoardPosition(stateOrUpdater.fen);
        setLastFenSource(source);
      } else if (skipPollRef.current) {
        console.log(`DIAG: setGameStateAndRef SKIPPING board sync from ${source} (poll skipped)`);
      }
    }
  }, []);

  useEffect(() => {
    if (!gameState) return;
    const drawOfferBy = gameState.draw_offer_by;
    if (drawOfferBy) {
      setDrawOfferStatus(drawOfferBy === user?.id ? 'sent' : 'received');
    } else {
      setDrawOfferStatus('none');
    }
  }, [gameState, user?.id]);

  const fetchGameState = useCallback(async () => {
    if (skipPollRef.current) {
      console.log('CHESS: Skipping poll (optimistic update in progress)');
      return;
    }

    try {
      const response = await gameApi.getState(matchId);

      if (skipPollRef.current) {
        console.log('CHESS: Discarding poll result (optimistic update in progress)');
        return;
      }

      const newState = response.state;
      if (skipPollRef.current) {
        console.log('DIAG: fetchGameState received state BUT skipPoll is ACTIVE. FEN:', newState.fen.substring(0, 30));
      }
      setGameStateAndRef(newState, 'poll');

      if (response.status === 'completed' && newState.game_over) {
        let retries = 3;
        const fetchResult = async () => {
          try {
            const result = await gameApi.getResult(matchId);
            onGameEndRef.current(result);
          } catch (err) {
            if (retries > 0) {
              console.warn(`CHESS: Failed to fetch result, retrying in 2s... (${retries} left)`);
              retries--;
              setTimeout(fetchResult, 2000);
            } else {
              console.error('CHESS: Failed to fetch result after retries', err);
            }
          }
        };
        fetchResult();
      }
    } catch (err: any) {
      if (!gameStateRef.current) {
        setError(err.message || 'Failed to fetch game state');
      }
      console.error('CHESS: Poll failed', err);
    } finally {
      setLoading(false);
    }
  }, [matchId, user?.id, setGameStateAndRef]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 2000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  const doSkipPoll = useCallback((durationMs: number) => {
    skipPollRef.current = true;
    setTimeout(() => {
      skipPollRef.current = false;
    }, durationMs);
  }, []);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string, piece: string): boolean => {
    const gs = gameStateRef.current;
    console.log('DIAG: onDrop started', {
      sourceSquare,
      targetSquare,
      piece,
      gsStatus: gs?.status,
      gsTurn: gs?.currentTurnPlayerId,
      userId: user?.id,
      moveLoading
    });

    if (!sourceSquare || !targetSquare) {
      console.warn('DIAG: onDrop rejected - missing square info');
      return false;
    }

    if (!gs) {
      console.warn('DIAG: onDrop rejected - no game state');
      return false;
    }

    if (gs.status !== 'active') {
      console.warn('DIAG: onDrop rejected - game not active', gs.status);
      return false;
    }

    if (gs.currentTurnPlayerId !== user?.id) {
      console.warn('DIAG: onDrop rejected - not your turn', { turn: gs.currentTurnPlayerId, user: user?.id });
      return false;
    }

    const isWhite = gs.white_user_id === user?.id;
    console.log('DIAG: moving piece info', { isWhite, piece });
    if (isWhite && piece[0] !== 'w') {
      console.warn('DIAG: onDrop rejected - cannot move black pieces as white');
      return false;
    }
    if (!isWhite && piece[0] !== 'b') {
      console.warn('DIAG: onDrop rejected - cannot move white pieces as black');
      return false;
    }

    if (!gs.fen) {
      console.warn('DIAG: onDrop rejected - no FEN in state');
      return false;
    }

    let chess: Chess;
    try {
      chess = new Chess(gs.fen);
    } catch (err) {
      console.error('DIAG: Invalid FEN', gs.fen, err);
      return false;
    }

    const moves = chess.moves({ verbose: true });
    const isPromotion = moves.some(m => m.from === sourceSquare && m.to === targetSquare && m.flags.includes('p'));

    if (isPromotion) {
      console.log('DIAG: Promotion move detected');
      setPromotionMove({ from: sourceSquare, to: targetSquare });
      setPromotionSquare(targetSquare);
      return true;
    }

    let moveResult;
    try {
      moveResult = chess.move({ from: sourceSquare as any, to: targetSquare as any });
    } catch (err) {
      console.error('DIAG: Local moves validation exception', err);
      return false;
    }

    if (moveResult === null) {
      console.warn('DIAG: Move rejected by chess.js validation', { fen: gs.fen, from: sourceSquare, to: targetSquare });
      return false;
    }

    console.log('DIAG: Move validated locally. SAN:', moveResult.san, 'New FEN:', chess.fen().substring(0, 30));

    const previousFen = gs.fen;
    const previousTurn = gs.currentTurnPlayerId;
    const newFen = chess.fen();

    console.log('DIAG: Performing optimistic update. New FEN:', newFen.substring(0, 30));

    doSkipPoll(6000);

    setBoardPosition(newFen);
    setLastFenSource('optimistic');

    setGameStateAndRef((prev: any) => ({
      ...prev,
      fen: newFen,
      currentTurnPlayerId: prev.currentTurnPlayerId === prev.white_user_id ? prev.black_user_id : prev.white_user_id
    }), 'optimistic');

    (async () => {
      try {
        setMoveLoading(true);
        console.log('CHESS: Sending move to server...');
        const response = await gameApi.processMove(matchId, {
          from: sourceSquare,
          to: targetSquare,
          type: 'move'
        });

        console.log('DIAG: Move accepted by server. Final FEN:', response.state.fen.substring(0, 30));

        setGameStateAndRef(response.state, 'server_ack');
        setBoardPosition(response.state.fen);
        setLastFenSource('server_ack');

        skipPollRef.current = false;
      } catch (err: any) {
        console.error('DIAG: Server rejected move - rolling back', err);
        setGameStateAndRef((prev: any) => ({
          ...prev,
          fen: previousFen,
          currentTurnPlayerId: previousTurn
        }), 'rollback');
        setBoardPosition(previousFen || 'start');
        setLastFenSource('rollback');
        setError(err.response?.data?.error || err.message);
        skipPollRef.current = false;
        await fetchGameState();
      } finally {
        setMoveLoading(false);
      }
    })();

    return true;
  }, [user?.id, matchId, fetchGameState, setGameStateAndRef, doSkipPoll]);

  const handlePromotion = useCallback(async (pieceType: string) => {
    if (!promotionMove) return;
    const gs = gameStateRef.current;
    const previousFen = gs?.fen;

    try {
      setMoveLoading(true);
      console.log('DIAG: Sending promotion move to server...', pieceType);

      setPromotionMove(null);
      setPromotionSquare(null);
      doSkipPoll(6000);

      const response = await gameApi.processMove(matchId, {
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: pieceType,
        type: 'move'
      });

      console.log('DIAG: Promotion accepted', response.state.fen.substring(0, 30));
      setGameStateAndRef(response.state, 'server_ack_promotion');
      setBoardPosition(response.state.fen);
      setLastFenSource('server_ack_promotion');

      skipPollRef.current = false;
    } catch (err: any) {
      console.error('DIAG: Server rejected promotion move', err);
      if (previousFen) {
        setGameStateAndRef((prev: any) => ({ ...prev, fen: previousFen }), 'rollback_promotion');
        setBoardPosition(previousFen);
        setLastFenSource('rollback_promotion');
      }
      setError(err.response?.data?.error || err.message);
      skipPollRef.current = false;
      await fetchGameState();
    } finally {
      setMoveLoading(false);
    }
  }, [promotionMove, matchId, fetchGameState, setGameStateAndRef, doSkipPoll]);

  useEffect(() => {
    if (lastFenSource !== 'poll') {
      console.log(`DIAG: boardPosition effectively changed to ${boardPosition.substring(0, 30)}... Source: ${lastFenSource}`);
    }
  }, [boardPosition, lastFenSource]);

  const handleDrawOffer = useCallback(async () => {
    if (!matchId) return;
    try {
      console.log('CHESS: Offering draw via API...');
      await gameApi.createDrawOffer(matchId);
      console.log('CHESS: Draw offer successfully created');
      setDrawOfferStatus('sent');
    } catch (err: any) {
      console.error('CHESS: Draw offer error', err);
      setError(err.response?.data?.error || err.message);
    }
  }, [matchId]);

  const onSquareClick = useCallback((square: string) => {
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'active' || gs.currentTurnPlayerId !== user?.id) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const chess = new Chess(gs.fen);
      const pieceOnSquare = chess.get(square as any);
      const isWhite = gs.white_user_id === user?.id;
      const isOwnPiece = pieceOnSquare && ((isWhite && pieceOnSquare.color === 'w') || (!isWhite && pieceOnSquare.color === 'b'));

      if (isOwnPiece) {
        console.log('DIAG: Re-selecting piece at', square);
        setSelectedSquare(square);
      } else {
        const pieceId = chess.get(selectedSquare as any);
        const fullPieceCode = pieceId ? (pieceId.color + pieceId.type.toUpperCase()) : '';
        console.log('DIAG: Attempting manual move via click', { from: selectedSquare, to: square, piece: fullPieceCode });
        const success = onDrop(selectedSquare, square, fullPieceCode);
        if (success) {
          setSelectedSquare(null);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      const chess = new Chess(gs.fen || 'start');
      const piece = chess.get(square as any);
      const isWhite = gs.white_user_id === user?.id;
      const isCorrectColor = piece && ((isWhite && piece.color === 'w') || (!isWhite && piece.color === 'b'));

      if (isCorrectColor) {
        console.log('DIAG: Selecting piece at', square);
        setSelectedSquare(square);
      }
    }
  }, [selectedSquare, user, onDrop]);

  const handleDrawResponse = useCallback(async (accept: boolean) => {
    try {
      if (accept) {
        await gameApi.acceptDrawOffer(matchId);
      } else {
        await gameApi.declineDrawOffer(matchId);
      }
      fetchGameState();
    } catch (err: any) {
      console.error('CHESS: Draw response error', err);
      setError(err.response?.data?.error || err.message);
    }
  }, [matchId, fetchGameState]);

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
    return matchParticipants?.find(p => p.user_id !== user?.id);
  }, [matchParticipants, user?.id]);

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

  return (
    // ✅ FIX 2a: root div — overflow-y-auto → overflow-hidden, touchAction: none added
    <div
      className="w-full h-full flex flex-col md:flex-row items-stretch gap-6 px-6 max-w-7xl mx-auto overflow-hidden pb-8"
      style={{ touchAction: 'none' }}
    >
      {/* ✅ FIX 2b: Left column — add overflow-y-auto so its own content scrolls */}
      <div className="flex-[2] flex flex-col gap-4 overflow-y-auto">
        {/* Opponent Info */}
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

        {(() => {
          const isMyTurn = gameState?.currentTurnPlayerId === user?.id;
          const isDraggable = !moveLoading && gameState?.status === 'active' && isMyTurn;
          return (
            <div className="mb-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700 font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span>Status: <span className={gameState?.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>{gameState?.status}</span></span>
                <span>Turn: <span className={isMyTurn ? 'text-blue-400 font-bold' : 'text-zinc-400'}>{isMyTurn ? 'YOURS' : 'OPPONENT'}</span></span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Draggable: {String(isDraggable)}</span>
                <span>Source: {lastFenSource}</span>
              </div>
              <div className="truncate text-[10px] text-zinc-600">FEN: {boardPosition.substring(0, 40)}...</div>
            </div>
          );
        })()}

        {/* ✅ FIX 2c: Board container — touchAction: none added */}
        <div
          className="relative aspect-square w-full max-w-[600px] mx-auto bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border-4 border-zinc-800"
          style={{ touchAction: 'none' }}
        >
          {(() => {
            const isMyTurn = gameState?.currentTurnPlayerId === user?.id;
            const isDraggable = !moveLoading && gameState?.status === 'active' && isMyTurn;
            if (lastFenSource !== 'poll') {
              console.log('DIAG: Rendering Chessboard Box', {
                pos: boardPosition.substring(0, 20),
                isDraggable,
                isMyTurn,
                gsStatus: gameState?.status,
                source: lastFenSource
              });
            }
            return null;
          })()}
          <Chessboard
            id="MainChessboard"
            animationDuration={200}
            position={boardPosition}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
            boardOrientation={boardOrientation}
            arePiecesDraggable={!moveLoading && gameState?.status === 'active' && gameState?.currentTurnPlayerId === user?.id}
            customDarkSquareStyle={{ backgroundColor: '#1a1a1a' }}
            customLightSquareStyle={{ backgroundColor: '#2a2a2a' }}
            customBoardStyle={{ touchAction: 'none' }}
            customSquareStyles={{
              ...(selectedSquare ? { [selectedSquare]: { backgroundColor: 'rgba(52, 211, 153, 0.4)' } } : {})
            }}
            onPieceDragBegin={(piece, sourceSquare) => console.log('DIAG: onPieceDragBegin', { piece, sourceSquare })}
            onPieceDragEnd={(piece, sourceSquare) => console.log('DIAG: onPieceDragEnd', { piece, sourceSquare })}
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

      {/* ✅ FIX 2d: Right column — add overflow-y-auto so it scrolls independently */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
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
                  <span className="text-[8px] text-gray-700">{new Date(h.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
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