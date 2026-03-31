import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Trophy, 
  Gamepad2, 
  Flame, 
  Crown, 
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { lobbyApi } from '../services/multiplayerApi';
import { RoomCategory } from '../types/multiplayer';

const Lobby: React.FC = () => {
  const [rooms, setRooms] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await lobbyApi.getRooms();
        setRooms(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load rooms');
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'users': return <Users className="w-6 h-6" />;
      case 'flame': return <Flame className="w-6 h-6" />;
      case 'trophy': return <Trophy className="w-6 h-6" />;
      case 'crown': return <Crown className="w-6 h-6" />;
      case 'gamepad': return <Gamepad2 className="w-6 h-6" />;
      default: return <Users className="w-6 h-6" />;
    }
  };

  const getRoomColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('ghetto')) return 'border-gray-500 text-gray-400 bg-gray-500/10';
    if (n.includes('hustlers')) return 'border-blue-500 text-blue-400 bg-blue-500/10';
    if (n.includes('pro')) return 'border-purple-500 text-purple-400 bg-purple-500/10';
    if (n.includes('odogwu')) return 'border-orange-500 text-orange-400 bg-orange-500/10';
    if (n.includes('grandmasters')) return 'border-yellow-500 text-yellow-400 bg-yellow-500/10';
    return 'border-emerald-500 text-emerald-400 bg-emerald-500/10';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black text-white mb-4 tracking-tight uppercase italic">
          Game Lobby
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Choose your arena. From casual street games to high-stakes professional leagues, 
          find your match and prove your skills.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room, index) => (
          <motion.div
            key={room.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(`/lobby/room/${room.id}`)}
            className={`group relative overflow-hidden rounded-2xl border-2 p-6 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${getRoomColor(room.name)}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 group-hover:border-white/20 transition-colors">
                {getIcon(room.icon_name)}
              </div>
              {room.is_free ? (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                  Free to Play
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider border border-orange-500/30">
                  Paid Wagers
                </span>
              )}
            </div>

            <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tight">
              {room.name}
            </h3>
            <p className="text-gray-400 text-sm mb-6 line-clamp-2">
              {room.description}
            </p>

            <div className="flex items-center justify-between mt-auto">
              <div className="text-xs font-mono uppercase tracking-widest opacity-60">
                {room.is_free ? (
                  'No Entry Fee'
                ) : (
                  `Wager: ₦${room.min_wager.toLocaleString()} ${room.max_wager ? `- ₦${room.max_wager.toLocaleString()}` : '+'}`
                )}
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Decorative background element */}
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <div className="scale-[4]">
                {getIcon(room.icon_name)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 p-8 rounded-3xl bg-white/5 border border-white/10 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to host your own game?</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
          Create a custom request in any room and wait for opponents to join. 
          You control the game type, player count, and wager amount.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Matchmaking</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Instant Payouts</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>Fair Play Guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
