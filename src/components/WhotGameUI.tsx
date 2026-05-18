import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  User, 
  Loader2, 
  AlertCircle, 
  ChevronRight, 
  Volume2, 
  VolumeX,
  CreditCard,
  Hand,
  Layers,
  ArrowRight
} from 'lucide-react';
import { gameApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';
import { VoiceAnnouncementService } from '../services/voiceAnnouncementService';

const SUIT_ICONS: Record<string, string> = {
  circle: '⭕',
  triangle: '🔺',
  cross: '✚',
  square: '🟦',
  star: '⭐',
  whot: 'WHOT'
};

const SUIT_COLORS: Record<string, string> = {
  circle: 'text-red-500',
  triangle: 'text-emerald-500',
  cross: 'text-blue-500',
  square: 'text-orange-500',
  star: 'text-yellow-500',
  whot: 'text-purple-500'
};

interface CardProps {
  suit: string;
  value: number;
  id: string;
  onClick?: () => void;
  isValid?: boolean;
  isSmall?: boolean;
  isFaceDown?: boolean;
}

const Card: React.FC<CardProps> = ({ suit, value, id, onClick, isValid, isSmall, isFaceDown }) => {
  if (isFaceDown) {
    return (
      <div className={`
        ${isSmall ? 'w-10 h-14' : 'w-24 h-36 md:w-32 md:h-48'} 
        bg-zinc-800 rounded-xl border-2 border-zinc-700 flex items-center justify-center p-2
        shadow-lg flex-shrink-0
      `}>
        <div className="w-full h-full border border-dashed border-zinc-600 rounded-lg flex items-center justify-center opacity-20">
          <Layers className="w-8 h-8 md:w-12 md:h-12" />
        </div>
      </div>
    );
  }

  const isWhot = value === 20;

  return (
    <motion.button
      whileHover={{ y: -10, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={!onClick || !isValid}
      className={`
        ${isSmall ? 'w-10 h-14' : 'w-24 h-36 md:w-32 md:h-48'} 
        bg-white rounded-xl border-2 transition-all relative flex flex-col items-center justify-center p-2
        ${isValid ? 'border-blue-500 shadow-blue-900/40 shadow-xl ring-2 ring-blue-500/20' : 'border-zinc-200 shadow-lg grayscale-[0.5] opacity-80'}
        ${!onClick ? 'cursor-default' : ''}
        flex-shrink-0
      `}
    >
      <div className={`absolute top-2 left-2 text-xs md:text-lg font-black ${SUIT_COLORS[suit]}`}>
        {isWhot ? '' : value}
      </div>
      
      <div className={`text-2xl md:text-5xl font-black ${SUIT_COLORS[suit]} mb-2`}>
        {SUIT_ICONS[suit]}
      </div>

      {!isWhot && (
        <div className={`absolute bottom-2 right-2 text-xs md:text-lg font-black ${SUIT_COLORS[suit]} rotate-180`}>
          {value}
        </div>
      )}
      
      {isWhot && (
        <div className="text-[10px] md:text-xs font-bold text-zinc-400 uppercase tracking-tighter">Wild Card</div>
      )}
    </motion.button>
  );
};

interface WhotGameUIProps {
  matchId: string;
  match: any;
  onGameEnd?: (winnerId: string | null) => void;
}

export const WhotGameUI: React.FC<WhotGameUIProps> = ({ matchId, match, onGameEnd }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [showSuitSelector, setShowSuitSelector] = useState(false);
  const [pendingCardToPlay, setPendingCardToPlay] = useState<any>(null);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(VoiceAnnouncementService.isEnabled());
  const [timeLeft, setTimeLeft] = useState(15);
  const [showAnnouncement, setShowAnnouncement] = useState<string | null>(null);

  const gameStateRef = useRef<any>(null);

  const fetchGameState = useCallback(async () => {
    try {
      const state = await gameApi.getState(matchId);
      if (state && state.state) {
        // Trigger voice announcement if new event
        if (state.state.lastEvent?.announcement && state.state.lastEvent !== gameStateRef.current?.lastEvent) {
           VoiceAnnouncementService.announce(state.state.lastEvent.announcement);
           setShowAnnouncement(state.state.lastEvent.announcement);
           setTimeout(() => setShowAnnouncement(null), 3000);
        }
        
        setGameState(state.state);
        gameStateRef.current = state.state;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 3000);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  useEffect(() => {
    if (!gameState || gameState.status !== 'active') return;
    
    const TURN_TIMEOUT = 15000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - (gameState.turnStartedAt || Date.now());
      const remaining = Math.max(0, Math.ceil((TURN_TIMEOUT - elapsed) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && gameState.currentTurnPlayerId === user?.id && !moveLoading) {
        handleAutoPick();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, user?.id, moveLoading]);

  const handleAutoPick = async () => {
    if (moveLoading) return;
    setMoveLoading(true);
    try {
      await gameApi.processMove(matchId, { type: 'auto_pick' });
      await fetchGameState();
    } catch (err) {
      console.error('WHOT: Auto pick failed', err);
    } finally {
      setMoveLoading(false);
    }
  };

  const handlePlayCard = async (cardId: string, value: number, suit: string) => {
    if (moveLoading) return;

    if (value === 20 || value === 1) {
      setPendingCardToPlay(cardId);
      setShowSuitSelector(true);
      return;
    }

    setMoveLoading(true);
    try {
      await gameApi.processMove(matchId, {
        type: 'play_card',
        cardId
      });
      await fetchGameState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMoveLoading(false);
    }
  };

  const handleSuitSelect = async (suit: string) => {
    if (!pendingCardToPlay) return;
    
    setMoveLoading(true);
    setShowSuitSelector(false);
    try {
      await gameApi.processMove(matchId, {
        type: 'play_card',
        cardId: pendingCardToPlay,
        calledSuit: suit
      });
      setPendingCardToPlay(null);
      await fetchGameState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMoveLoading(false);
    }
  };

  const handlePickCard = async () => {
    if (moveLoading) return;
    setMoveLoading(true);
    try {
      await gameApi.processMove(matchId, { type: 'pick_card' });
      await fetchGameState();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMoveLoading(false);
    }
  };

  const isValidPlay = (card: any) => {
    if (!gameState) return false;
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    if (card.value === 20) return true;
    
    if (gameState.pendingPenalty) {
       if (gameState.pendingPenalty.type === 'pick2') return card.value === 2;
       if (gameState.pendingPenalty.type === 'pick3') return card.value === 3;
       if (gameState.pendingPenalty.type === 'suspension') return card.value === 8;
    }

    if (gameState.calledSuit) {
       return card.suit === gameState.calledSuit || card.value === topCard.value;
    }

    return card.suit === topCard.suit || card.value === topCard.value;
  };

  const toggleAnnouncements = () => {
    const newVal = !announcementsEnabled;
    VoiceAnnouncementService.setEnabled(newVal);
    setAnnouncementsEnabled(newVal);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-zinc-500 font-medium">Shuffling the deck...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-bold text-white">Oops! Connection problem</h2>
        <p className="text-zinc-500 max-w-sm">{error}</p>
        <button onClick={fetchGameState} className="px-6 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  const isMyTurn = gameState.currentTurnPlayerId === user?.id && !gameState.generalMarketPending;
  const inGeneralMarket = gameState.generalMarketPending?.includes(user?.id);
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  return (
    <div className="w-full flex flex-col items-center gap-8 py-8 animate-in fade-in duration-500">
      
      {/* Visual Announcement Toast */}
      <AnimatePresence>
        {showAnnouncement && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-24 z-[100] bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-2xl uppercase tracking-widest border-2 border-white/20"
          >
            {showAnnouncement}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Opponents Area */}
      <div className="flex flex-wrap justify-center gap-8 w-full max-w-6xl px-4">
        {gameState.participants.map((p: any) => {
          if (p.userId === user?.id) return null;
          const isActiveTurn = gameState.currentTurnPlayerId === p.userId;
          const isPendingGM = gameState.generalMarketPending?.includes(p.userId);
          
          return (
            <div key={p.userId} className={`flex flex-col items-center gap-2 p-4 rounded-3xl transition-all ${
              isActiveTurn ? 'bg-zinc-800/80 ring-2 ring-blue-500/50' : 'bg-zinc-900/40'
            }`}>
              <div className="relative">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-zinc-800 border-2 transition-colors ${
                  isActiveTurn ? 'border-blue-500' : 'border-zinc-700'
                }`}>
                  <User className="w-8 h-8 text-zinc-400" />
                </div>
                {p.status === 'disconnected' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-zinc-900 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-sm font-bold text-white max-w-[100px] truncate">{p.username}</span>
              
              <div className="flex gap-1 mt-1">
                {Array.from({ length: Math.min(p.handCount, 5) }).map((_, i) => (
                   <div key={i} className="w-6 h-9 bg-zinc-800 border border-zinc-700 rounded shadow-sm rotate-12 -ml-2" />
                ))}
                {p.handCount > 5 && (
                  <span className="text-[10px] text-zinc-500 font-bold ml-1">+{p.handCount - 5}</span>
                )}
              </div>

              {isPendingGM && (
                 <div className="text-[10px] text-orange-500 font-black uppercase mt-1 animate-pulse">General Market</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Game Table Center */}
      <div className="flex flex-col items-center bg-zinc-900/50 p-8 md:p-12 rounded-[40px] border border-zinc-800 shadow-2xl w-full max-w-4xl min-h-[400px] relative">
        
        {/* Game Stats & Toggle */}
        <div className="absolute top-6 right-6 flex items-center gap-4">
           <button 
             onClick={toggleAnnouncements}
             className={`p-2 rounded-xl transition-colors ${announcementsEnabled ? 'bg-blue-600/20 text-blue-500' : 'bg-zinc-800 text-zinc-500'}`}
           >
             {announcementsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
           </button>
        </div>

        <div className="absolute top-6 left-6 flex flex-col">
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Variant</span>
          <div className="px-3 py-1 bg-zinc-800 rounded-lg text-xs font-black text-white uppercase">
            {gameState.variant}
          </div>
        </div>

        {/* The Action */}
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-8">
           {/* Stock Pile */}
           <div className="flex flex-col items-center gap-4">
              <div className="relative cursor-pointer group" onClick={isMyTurn || inGeneralMarket ? handlePickCard : undefined}>
                <div className="w-24 h-36 md:w-32 md:h-48 bg-zinc-800 rounded-xl border-2 border-zinc-700 shadow-xl" />
                <div className="absolute -top-1 -left-1 w-24 h-36 md:w-32 md:h-48 bg-zinc-800 rounded-xl border-2 border-zinc-700 shadow-xl" />
                <div className="absolute -top-2 -left-2 w-24 h-36 md:w-32 md:h-48 bg-zinc-800 rounded-xl border-2 border-zinc-700 shadow-xl flex items-center justify-center group-hover:border-blue-500 transition-colors">
                   <Layers className="w-12 h-12 text-zinc-600 group-hover:text-blue-500 transition-colors" />
                   <div className="absolute bottom-4 bg-zinc-900 px-3 py-1 rounded-full text-xs font-bold text-white">
                     {gameState.deckCount || gameState.deck?.length || '?'} left
                   </div>
                </div>
              </div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Stock Pile</span>
           </div>

           {/* Discard Pile (Top Card) */}
           <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Card 
                   suit={topCard.suit} 
                   value={topCard.value} 
                   id={topCard.id} 
                />
                
                {/* Called Suit Overlay */}
                {gameState.calledSuit && (
                   <motion.div 
                     initial={{ scale: 0.5, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="absolute -top-6 -right-6 w-16 h-16 bg-zinc-900 border-2 border-blue-500 rounded-full flex flex-col items-center justify-center shadow-2xl z-10"
                   >
                      <span className="text-xs text-blue-500 font-black uppercase leading-none mb-1">NEED</span>
                      <span className="text-2xl">{SUIT_ICONS[gameState.calledSuit]}</span>
                   </motion.div>
                )}
              </div>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Discard Pile</span>
           </div>
        </div>

        {/* Turn Indicators & Alerts */}
        <div className="flex flex-col items-center gap-4 text-center mt-4">
           {gameState.pendingPenalty && (
             <motion.div 
               animate={{ scale: [1, 1.05, 1] }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-2"
             >
               <AlertCircle className="w-4 h-4" />
               Pick {gameState.pendingPenalty.amount} Required!
             </motion.div>
           )}

           {gameState.generalMarketPending && (
              <div className="bg-orange-600 text-white px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest">
                 General Market Active
              </div>
           )}

           <div className="flex flex-col items-center">
              <div className="flex items-center gap-3 mb-2">
                 <div className={`w-3 h-3 rounded-full ${isMyTurn || inGeneralMarket ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                 <span className="text-xl font-black text-white uppercase tracking-wider">
                   {isMyTurn ? "Your Turn" : inGeneralMarket ? "Respond to Market!" : "Opponent acts..."}
                 </span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Time Remaining</span>
                 <span className={`text-lg font-black font-mono ${timeLeft <= 5 ? 'text-red-500' : 'text-blue-500'}`}>
                   00:{timeLeft.toString().padStart(2, '0')}
                 </span>
              </div>
           </div>
        </div>
      </div>

      {/* Player Hand Area */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 p-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-zinc-900 rounded-2xl">
                   <Hand className="w-6 h-6 text-blue-500" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Your Private Hand</span>
                   <span className="text-lg font-black text-white uppercase">{gameState.privateHand.length} Cards</span>
                 </div>
              </div>

              {(isMyTurn || inGeneralMarket) && (
                <div className="flex items-center gap-4">
                   <button 
                      onClick={handlePickCard}
                      disabled={moveLoading}
                      className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
                   >
                      {moveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Pick Card
                   </button>
                </div>
              )}
           </div>

           <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide">
              {gameState.privateHand.map((card: any) => (
                <Card 
                   key={card.id}
                   suit={card.suit}
                   value={card.value}
                   id={card.id}
                   isValid={isMyTurn && isValidPlay(card) || (inGeneralMarket && card.value === 14)}
                   onClick={() => (isMyTurn && isValidPlay(card)) || (inGeneralMarket && card.value === 14) ? handlePlayCard(card.id, card.value, card.suit) : undefined}
                />
              ))}
              {gameState.privateHand.length === 0 && (
                <div className="flex items-center justify-center w-full py-12 text-zinc-600 font-black uppercase tracking-widest opacity-50">
                   Your hand is empty
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Suit Selector Modal */}
      <AnimatePresence>
        {showSuitSelector && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => !moveLoading && setShowSuitSelector(false)}
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 max-w-md w-full shadow-2xl"
              >
                 <h2 className="text-2xl font-black text-white uppercase tracking-widest text-center mb-8">
                   Choose Required Suit
                 </h2>
                 <div className="grid grid-cols-2 gap-4">
                    {Object.entries(SUIT_ICONS).filter(([k]) => k !== 'whot').map(([suit, icon]) => (
                       <button
                         key={suit}
                         onClick={() => handleSuitSelect(suit)}
                         disabled={moveLoading}
                         className="flex flex-col items-center gap-3 p-6 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-blue-500 rounded-3xl transition-all group"
                       >
                          <span className="text-4xl transition-transform group-hover:scale-125">{icon}</span>
                          <span className={`text-xs font-black uppercase tracking-widest ${SUIT_COLORS[suit]}`}>{suit}</span>
                       </button>
                    ))}
                 </div>
                 
                 <button 
                   onClick={() => setShowSuitSelector(false)}
                   disabled={moveLoading}
                   className="w-full mt-8 py-4 text-zinc-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
                 >
                   Cancel
                 </button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Game End Overlay */}
      {gameState.status === 'completed' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl p-8 flex flex-col items-center">
           <div className="max-w-3xl w-full flex flex-col items-center gap-12 py-12">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4 text-center"
              >
                 <div className="w-24 h-24 bg-yellow-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/20">
                    <Trophy className="w-12 h-12 text-black" />
                 </div>
                 <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-widest">Game Over!</h2>
                 <p className="text-zinc-500 font-black uppercase tracking-widest text-xl">
                   {gameState.variant === 'scored' ? 'Scored Whot Results' : 'Classic Whot Final Rankings'}
                 </p>
              </motion.div>

              <div className="grid gap-4 w-full">
                 {gameState.participants.sort((a: any, b: any) => (a.rank || 99) - (b.rank || 99)).map((p: any) => (
                    <div key={p.userId} className={`flex items-center justify-between p-6 bg-zinc-900 border rounded-3xl ${
                      p.rank === 1 ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10' : 'border-zinc-800'
                    }`}>
                       <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl ${
                            p.rank === 1 ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {p.rank || '-'}
                          </div>
                          <div className="flex flex-col">
                             <span className="text-lg font-black text-white uppercase">{p.username}</span>
                             <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{p.rank === 1 ? 'WINNER' : 'FINISHED'}</span>
                          </div>
                       </div>

                       {gameState.variant === 'scored' && (
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Hand Score</span>
                            <span className={`text-2xl font-black ${p.rank === 1 ? 'text-yellow-500' : 'text-white'}`}>
                              {p.tallyScore || 0}
                            </span>
                         </div>
                       )}
                    </div>
                 ))}
              </div>

              <div className="flex gap-4">
                  <button 
                    onClick={() => window.location.href = '/lobby'}
                    className="px-12 py-4 bg-zinc-800 text-white rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-zinc-700"
                  >
                    Return to Lobby
                  </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
