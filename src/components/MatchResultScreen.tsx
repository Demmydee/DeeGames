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
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  result: any;
  onClose: () => void;
}

const MatchResultScreen: React.FC<Props> = ({ result, onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-8 text-center bg-gradient-to-b from-emerald-500/10 to-transparent">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20 rotate-3"
            >
              <Trophy className="w-12 h-12 text-black" />
            </motion.div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">
              Match Settled
            </h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
              {result.pay_mode} Mode • {new Date(result.settled_at).toLocaleDateString()}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-px bg-white/10 border-y border-white/10">
            <div className="bg-[#0a0a0a] p-6 text-center">
              <div className="text-2xl font-black text-white">₦{(result.total_pool_kobo / 100).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Total Pool</div>
            </div>
            <div className="bg-[#0a0a0a] p-6 text-center">
              <div className="text-2xl font-black text-emerald-500">₦{(result.net_pool_kobo / 100).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Net Payout</div>
            </div>
            <div className="bg-[#0a0a0a] p-6 text-center">
              <div className="text-2xl font-black text-red-500">₦{(result.house_cut_kobo / 100).toLocaleString()}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">House Cut</div>
            </div>
          </div>

          {/* Rankings List */}
          <div className="p-8">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Final Standings & Payouts
            </h3>
            <div className="space-y-3">
              {result.rankings.map((p: any, index: number) => (
                <motion.div
                  key={p.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                    p.rank === 1 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                      p.rank === 1 ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'
                    }`}>
                      {p.rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{p.username}</span>
                        {p.defeatReason && (
                          <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 text-red-500 rounded border border-red-500/20 uppercase tracking-widest font-bold">
                            {p.defeatReason}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">
                        Score: {p.score}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-black ${p.payoutKobo > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                      {p.payoutKobo > 0 ? '+' : ''}₦{(p.payoutKobo / 100).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">
                      {p.payoutKobo > 0 ? 'Profit' : 'Loss'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-8 pt-0 flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => navigate('/lobby')}
              className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MatchResultScreen;
