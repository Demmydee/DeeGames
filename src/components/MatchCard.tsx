import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Gamepad2, 
  Trophy, 
  Clock, 
  ArrowRight,
  User,
  Wallet,
  Play
} from 'lucide-react';
import { Match } from '../types/multiplayer';

interface Props {
  match: Match;
}

const MatchCard: React.FC<Props> = ({ match }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            match.status === 'in_progress' 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          }`}>
            {match.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-1">
          {match.game_type?.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span>Started by <span className="text-gray-300 font-bold">{match.started_by?.username}</span></span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Players</span>
          </div>
          <div className="text-sm font-bold text-white">
            {match.participants?.length || 0}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Wallet className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Prize Pool</span>
          </div>
          <div className="text-sm font-bold text-emerald-400">
            {match.amount > 0 ? `₦${(match.amount * (match.participants?.length || 0)).toLocaleString()}` : 'FREE'}
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="flex -space-x-2 mb-6">
        {match.participants?.map((p) => (
          <div 
            key={p.id || `p-${p.user_id}`} 
            title={p.users?.username}
            className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white uppercase"
          >
            {p.users?.username.substring(0, 2)}
          </div>
        ))}
      </div>

      {/* Action */}
      <button
        className="w-full py-3 rounded-xl font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
      >
        <Play className="w-4 h-4" />
        <span>Spectate Match</span>
      </button>

      {/* Time */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest">
        <Clock className="w-3 h-3" />
        <span>Started {new Date(match.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </motion.div>
  );
};

export default MatchCard;
