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
  Play,
  XCircle,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { GameRequest } from '../types/multiplayer';
import { useAuth } from '../context/AuthContext';

interface Props {
  request: GameRequest;
  onJoin: () => void;
  onCancel: () => void;
  onLeave: () => void;
  onStart: () => void;
}

const GameRequestCard: React.FC<Props> = ({ request, onJoin, onCancel, onLeave, onStart }) => {
  const { user } = useAuth();
  const isFull = (request.participants?.length || 0) >= request.required_players;
  const isRequester = request.requester_user_id === user?.id;
  const isParticipant = request.participants?.some(p => p.user_id === user?.id);
  const canStart = isRequester && isFull && request.status === 'ready_to_start';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <Gamepad2 className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            request.category === 'arena' 
              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          }`}>
            {request.category}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            request.status === 'ready_to_start' 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
          }`}>
            {request.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-1">
          {request.game_type?.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span>Hosted by <span className="text-gray-300 font-bold">{request.requester?.username}</span></span>
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
            {request.participants?.length || 0} / {request.required_players}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-black/20 border border-white/5">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Wallet className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Wager</span>
          </div>
          <div className="text-sm font-bold text-emerald-400">
            {request.amount > 0 ? `₦${request.amount.toLocaleString()}` : 'FREE'}
          </div>
        </div>
      </div>

      {/* Participants List */}
      <div className="flex -space-x-2 mb-6">
        {request.participants?.map((p) => (
          <div 
            key={p.id || `p-${p.user_id}`} 
            title={p.users?.username}
            className={`w-8 h-8 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold text-white uppercase ${
              p.user_id === request.requester_user_id ? 'bg-orange-600' : 'bg-emerald-600'
            }`}
          >
            {p.users?.username.substring(0, 2)}
          </div>
        ))}
        {Array.from({ length: Math.max(0, request.required_players - (request.participants?.length || 0)) }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase"
          >
            ?
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isRequester ? (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={onStart}
              disabled={!canStart}
              className={`flex-[2] py-3 rounded-xl font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 ${
                canStart 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20' 
                  : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/10'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Start Game</span>
            </button>
          </div>
        ) : isParticipant ? (
          <div className="flex gap-2">
            <button
              onClick={onLeave}
              className="flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all flex items-center justify-center gap-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave</span>
            </button>
            <div className="flex-[2] py-3 rounded-xl font-black uppercase italic tracking-widest flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
              <span>Joined</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onJoin}
            disabled={isFull}
            className={`w-full py-3 rounded-xl font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 ${
              isFull 
                ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20'
            }`}
          >
            {isFull ? (
              <span>Full Room</span>
            ) : (
              <>
                <span>Join Game</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Time */}
      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-gray-600 uppercase tracking-widest">
        <Clock className="w-3 h-3" />
        <span>Created {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </motion.div>
  );
};

export default GameRequestCard;
