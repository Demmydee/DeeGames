import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Plus, 
  Gamepad2, 
  Trophy, 
  ChevronLeft, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock
} from 'lucide-react';
import { lobbyApi, gameRequestApi } from '../services/multiplayerApi';
import { RoomCategory, GameRequest, Match } from '../types/multiplayer';
import CreateRequestModal from '../components/CreateRequestModal';
import GameRequestCard from '../components/GameRequestCard';
import MatchCard from '../components/MatchCard';

const Room: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomCategory | null>(null);
  const [requests, setRequests] = useState<GameRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'matches'>('requests');

  const fetchData = useCallback(async (isRefreshing = false) => {
    if (!id) return;
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const [roomData, gamesData] = await Promise.all([
        lobbyApi.getRoomById(id),
        lobbyApi.getRoomGames(id)
      ]);
      setRoom(roomData);
      setRequests(gamesData.requests);
      setMatches(gamesData.matches);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load room data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    // Set up polling for real-time updates (every 5 seconds)
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleJoinRequest = async (requestId: string) => {
    try {
      await gameRequestApi.join(requestId);
      fetchData(true);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await gameRequestApi.cancel(requestId);
      fetchData(true);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleLeaveRequest = async (requestId: string) => {
    try {
      await gameRequestApi.leave(requestId);
      fetchData(true);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleStartGame = async (requestId: string) => {
    try {
      const { match_id } = await gameRequestApi.start(requestId);
      navigate(`/match/${match_id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Room not found</h2>
        <p className="text-gray-400 mb-6">{error || 'The room you are looking for does not exist.'}</p>
        <button
          onClick={() => navigate('/lobby')}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tight">
                {room.name}
              </h1>
              {room.is_free ? (
                <Unlock className="w-4 h-4 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 text-orange-400" />
              )}
            </div>
            <p className="text-gray-400 text-sm">{room.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-gray-400"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-5 h-5" />
            <span>Create Request</span>
          </button>
        </div>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{(room as any).occupancy || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Players in Room</div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{requests.length + matches.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Total Activities</div>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {room.is_free ? 'FREE' : `₦${room.min_wager.toLocaleString()}${room.max_wager ? ` - ₦${room.max_wager.toLocaleString()}` : '+'}`}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-widest">Wager Range</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'matches' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
        >
          Matches ({matches.length})
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'requests' ? (
          <motion.div
            key="requests"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {requests.length > 0 ? (
              requests.map((request, i) => (
                <GameRequestCard
                  key={request.id || `req-${i}`}
                  request={request}
                  onJoin={() => handleJoinRequest(request.id)}
                  onCancel={() => handleCancelRequest(request.id)}
                  onLeave={() => handleLeaveRequest(request.id)}
                  onStart={() => handleStartGame(request.id)}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Plus className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No active requests</h3>
                <p className="text-gray-500 max-w-xs mx-auto mb-6">
                  Be the first to create a game request in this room!
                </p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                >
                  Create Request
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="matches"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {matches.length > 0 ? (
              matches.map((match, i) => (
                <MatchCard key={match.id || `match-${i}`} match={match} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Gamepad2 className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No live matches</h3>
                <p className="text-gray-500 max-w-xs mx-auto">
                  Matches will appear here once they start. Join a request to get started!
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      {showCreateModal && (
        <CreateRequestModal 
          room={room} 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchData(true);
          }}
        />
      )}
    </div>
  );
};

export default Room;
