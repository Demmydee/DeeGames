import React from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Home, 
  RotateCcw,
  User,
  ShieldAlert,
  PlusCircle,
  LogOut
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

  const winner = result.rankings.find((r: any) => r.rank === 1);
  const isWinner = winner?.userId === user?.id;

  const myRanking = result.rankings.find((r: any) => r.userId === user?.id);
  const profitKobo = myRanking ? (myRanking.payoutKobo - myRanking.wagerKobo) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          <div className="p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/20 to-transparent opacity-50" />

            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              className={`relative z-10 w-32 h-32 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl ${
                isWinner
                  ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/40 rotate-6'
                  : 'bg-white/5 shadow-black/40 text-white/20 -rotate-3'
              }`}
            >
              <Trophy className={`w-16 h-16 ${isWinner ? 'text-black' : 'text-white/20'}`} />
              {isWinner && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-white rounded-[2rem] filter blur-xl -z-10"
                />
              )}
            </motion.div>

            <div className="relative z-10">
              <h1 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none">
                {isWinner ? 'Victory' : 'Defeat'}
              </h1>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                  {result.pay_mode} Mode
                </span>
                <div className="w-1 h-1 rounded-full bg-gray-600" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                  {new Date(result.settled_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Summary Banner */}
          <div className="px-8 mb-4">
            <div className={`p-6 rounded-3xl border flex items-center justify-between ${
              profitKobo >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
            }`}>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Your Payout</p>
                <h2 className={`text-4xl font-black ${profitKobo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ₦{((myRanking?.payoutKobo || 0) / 100).toLocaleString()}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Net Profit</p>
                <div className={`flex items-center gap-2 text-xl font-bold ${profitKobo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {profitKobo >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span>{profitKobo >= 0 ? '+' : '-'}₦{Math.abs(profitKobo / 100).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rankings List First */}
          <div className="px-8 py-2">
            <div className="space-y-3">
              {result.rankings.map((p: any, index: number) => (
                <motion.div
                  key={p.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${
                    p.rank === 1
                      ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                      p.rank === 1 ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-white/10 text-white'
                    }`}>
                      {p.rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">{p.username}</span>
                        {p.rank === 1 && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500 text-black rounded font-black uppercase tracking-widest">
                            Winner
                          </span>
                        )}
                        {p.defeatReason && p.rank !== 1 && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 uppercase tracking-widest font-bold">
                            {p.defeatReason}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 font-bold">
                        Final Score: {p.score}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-black ${p.payoutKobo > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {p.payoutKobo > 0 ? '+' : ''}₦{(p.payoutKobo / 100).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                      {p.payoutKobo > 0 ? 'Winnings' : 'Loss'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-8 flex gap-4">
            <button
              onClick={() => {
                if (onExit) onExit();
                else navigate('/lobby');
              }}
              className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] font-black uppercase italic tracking-tight transition-all border border-white/10 flex items-center justify-center gap-3 group"
            >
              <LogOut className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              Exit to Lobby
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/lobby');
              }}
              className="flex-1 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase italic tracking-tight transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <RotateCcw className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Quick Rematch</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MatchResultScreen;
