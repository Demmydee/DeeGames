import React from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  LogOut,
  Target,
  History,
  Medal,
  Award,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  result: any;
  onClose: () => void;
  onExit?: () => void;
}

const MatchResultScreen: React.FC<Props> = ({ result, onClose, onExit }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Robust winner detection
  const myRanking = result.rankings?.find((r: any) => 
    (r.userId?.toString().toLowerCase() === user?.id?.toString().toLowerCase()) ||
    (r.id?.toString().toLowerCase() === user?.id?.toString().toLowerCase())
  );
  
  // Use the rank from rankings or the isWinner flag if provided
  const isWinner = myRanking?.rank === 1 || myRanking?.isWinner === true;
  const isTie = result.rankings?.filter((r: any) => r.rank === 1).length > 1 || result.is_draw;
  const isDraw = result.is_draw === true;
  const profitKobo = myRanking ? (myRanking.payoutKobo - myRanking.wagerKobo) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505]/98 backdrop-blur-2xl flex items-start justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl my-auto py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] relative flex flex-col max-h-[85vh]"
        >
          {/* Top Banner with Dynamic Status */}
          <div className={`p-6 sm:p-10 text-center relative overflow-hidden flex-shrink-0 ${
            isWinner ? 'bg-yellow-500/10' : 'bg-red-500/5'
          }`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-20" />
            
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: isWinner ? 12 : -6 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
              className={`relative z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl transition-all duration-700 ${
                isWinner 
                  ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-700 shadow-[0_0_50px_rgba(234,179,8,0.4)]' 
                  : 'bg-gradient-to-br from-gray-700 to-gray-900 shadow-xl grayscale'
              }`}
            >
              <Trophy className={`w-10 h-10 sm:w-16 sm:h-16 ${isWinner ? 'text-black' : 'text-white/20'}`} />
              {isWinner && (
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-yellow-400 rounded-2xl sm:rounded-[2rem] filter blur-3xl -z-10" 
                />
              )}
            </motion.div>
            
            <div className="relative z-10">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-4xl sm:text-6xl font-black uppercase italic tracking-tighter mb-2 leading-none ${
                  isDraw ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' :
                  isWinner ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'text-white/80'
                }`}
              >
                {isDraw ? 'Draw' : (isWinner ? (isTie ? 'Tie!' : 'Winner') : 'Defeat')}
              </motion.h1>
              <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-3">
                <span className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] bg-white/5 px-2 sm:px-3 py-1 rounded-full border border-white/10">
                  {result.game_variant?.replace('_', ' ') || 'Classic'}
                </span>
                <span className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] bg-white/5 px-2 sm:px-3 py-1 rounded-full border border-white/10">
                  {result.pay_mode} Mode
                </span>
                <span className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] bg-white/5 px-2 sm:px-3 py-1 rounded-full border border-white/10">
                  {new Date(result.settled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-10 pt-4 sm:pt-6 space-y-8 sm:space-y-12 custom-scrollbar">
            {/* Earnings Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] border-2 flex items-center justify-between shadow-2xl relative overflow-hidden group ${
                profitKobo >= 0 
                  ? 'bg-[#0f1715] border-emerald-500/30' 
                  : 'bg-[#1a1111] border-red-500/20'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">Profit / Loss Summary</p>
                <h2 className={`text-4xl sm:text-6xl font-black tracking-tighter ${profitKobo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profitKobo >= 0 ? '+' : ''}₦{(profitKobo / 100).toLocaleString()}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2">
                  <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase sm:border-r sm:border-white/10 sm:pr-4">
                    Wager: ₦{((myRanking?.wagerKobo || 0) / 100).toLocaleString()}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase">
                    Payout: ₦{((myRanking?.payoutKobo || 0) / 100).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="relative z-10 hidden sm:block">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-inner ${
                  profitKobo >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'
                }`}>
                  {profitKobo >= 0 ? <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10" /> : <TrendingDown className="w-8 h-8 sm:w-10 sm:h-10" />}
                </div>
              </div>
            </motion.div>

            {/* Match History Table */}
            {result.history && result.history.length > 0 && result.game_type?.toString().toLowerCase().includes('chess') === false && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                    <History className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Match Summary</h3>
                </div>
                <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-md">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="p-4 px-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Round</th>
                        {result.rankings.map((p: any) => (
                          <th key={p.userId || p.id} className="p-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-white uppercase tracking-tight">{p.username}</span>
                              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">Final: {p.score}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.history.map((round: any, idx: number) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 px-6">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-emerald-500 italic">#{round.round || idx + 1}</span>
                              {(round.isTieBreakerInitial || round.isTieBreakerContinued || round.isTieBreakerResolved) && (
                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" title="Tie Breaker" />
                              )}
                            </div>
                          </td>
                          {result.rankings.map((p: any) => {
                            const pid = p.userId || p.id;
                            const roll = round.rolls ? round.rolls[pid] : undefined;
                            const isEliminated = round.eliminatedPlayerId === pid;
                            return (
                              <td key={pid} className="p-4 text-center">
                                {roll !== undefined ? (
                                  <span className={`text-sm font-black ${isEliminated ? 'text-red-500' : 'text-white'}`}>
                                    {roll}
                                  </span>
                                ) : (
                                  <span className="text-gray-700">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Chess History Summary */}
            {result.history && result.history.length > 0 && result.game_type?.toString().toLowerCase().includes('chess') === true && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                    <History className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Move History</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 p-4 rounded-[2rem] border border-white/10 max-h-64 overflow-y-auto custom-scrollbar">
                   {result.history.map((move: any, idx: number) => (
                     <div key={idx} className="flex justify-between p-2 bg-black/20 rounded-xl border border-white/5 text-[10px]">
                       <span className="text-gray-500">{Math.floor(idx/2) + 1}{move.player === 'white' ? 'w' : 'b'}.</span>
                       <span className="font-bold text-emerald-400 tracking-wider uppercase italic">{move.move}</span>
                     </div>
                   ))}
                </div>
              </section>
            )}

            {/* Standings Section */}
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                  <Target className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Standings & Payouts</h3>
              </div>
              <div className="space-y-4">
                {result.rankings.map((p: any, index: number) => (
                  <motion.div
                    key={p.userId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (index * 0.05) }}
                    className={`p-6 rounded-3xl border transition-all hover:scale-[1.02] duration-300 ${
                      p.rank === 1 
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.1)]' 
                        : 'bg-white/5 border-white/10 opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${
                          p.rank === 1 
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg' 
                            : 'bg-white/5 text-gray-400'
                        }`}>
                          {p.rank === 1 ? <Award className="w-8 h-8" /> : p.rank}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-white italic">{p.username}</span>
                            {p.rank === 1 && (
                              <span className="text-[9px] px-2 py-1 bg-yellow-500 text-black rounded-lg font-black uppercase tracking-widest">Champion</span>
                            )}
                            {p.userId === user?.id && (
                              <span className="text-[9px] px-2 py-1 bg-white/10 text-white/50 rounded-lg font-black uppercase tracking-widest">You</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                            Final: {p.score} pts • {p.status === 'left' ? 'Left Game' : (p.defeatReason || 'Completed')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-black ${p.payoutKobo > 0 ? 'text-emerald-400 font-mono italic' : 'text-gray-700'}`}>
                          ₦{(p.payoutKobo / 100).toLocaleString()}
                        </div>
                        <div className={`text-[9px] font-black uppercase tracking-widest mt-1 ${
                          (p.payoutKobo - p.wagerKobo) >= 0 ? 'text-emerald-500/60' : 'text-red-500/60'
                        }`}>
                          { (p.payoutKobo - p.wagerKobo) >= 0 ? '+' : '-' }₦{Math.abs((p.payoutKobo - p.wagerKobo) / 100).toLocaleString()} Profit
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Action Footer */}
          <div className="p-6 sm:p-10 pt-4 pb-8 sm:pb-14">
            <button
              onClick={() => {
                if (onExit) onExit();
                else navigate('/lobby');
              }}
              className="w-full py-5 sm:py-7 bg-white hover:bg-emerald-500 text-black rounded-2xl sm:rounded-[2.5rem] font-black uppercase italic tracking-tighter transition-all shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:shadow-emerald-500/20 flex items-center justify-center gap-3 sm:gap-5 group"
            >
              <LogOut className="w-5 h-5 sm:w-7 sm:h-7 transition-all group-hover:translate-x-2" />
              <span className="text-lg sm:text-xl">Exit to Lobby</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MatchResultScreen;
