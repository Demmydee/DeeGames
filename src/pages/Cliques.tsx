import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Check, 
  X, 
  Search, 
  Loader2, 
  AlertCircle,
  Clock,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  MoreVertical,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { friendApi, socialApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ui/ErrorMessage';
import apiClient from '../api/client';

const Cliques: React.FC = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [recentOpponents, setRecentOpponents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'opponents' | 'search'>('friends');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [f, inc, out, opp] = await Promise.all([
        friendApi.getFriends(),
        friendApi.getIncomingRequests(),
        friendApi.getOutgoingRequests(),
        socialApi.getRecentOpponents()
      ]);
      setFriends(f);
      setIncoming(inc);
      setOutgoing(out);
      setRecentOpponents(opp);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setError(null);
    try {
      const response = await apiClient.get(`/api/social/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
      if (response.data.length === 0) {
        setError('No users found matching that username');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await friendApi.acceptRequest(id);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await friendApi.rejectRequest(id);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      await friendApi.removeFriend(id);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await friendApi.sendRequest(userId);
      alert('Friend request sent!');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isOnline = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return false;
    const lastSeenDate = new Date(lastSeenAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Cliques</h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Social Network & Connections</p>
            </div>
          </div>
        </header>

        <ErrorMessage message={error} className="mb-6" />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
          {[
            { id: 'friends', label: 'Friends', count: friends.length },
            { id: 'requests', label: 'Requests', count: incoming.length + outgoing.length },
            { id: 'opponents', label: 'Recent Opponents', count: recentOpponents.length },
            { id: 'search', label: 'Find Users', count: 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 sm:px-6 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'search' && (
          <div className="mb-8">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-sm"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Syncing Connections...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeTab === 'search' && (
              searchResults.length === 0 ? (
                !searching && searchQuery && (
                  <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl opacity-40">
                    <Search className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No users found</p>
                  </div>
                )
              ) : (
                searchResults.map((res) => (
                  <div
                    key={res.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-500 border border-emerald-500/20">
                        {res.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{res.username}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          Member since {new Date(res.created_at).getFullYear()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {res.id === user?.id ? (
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4">You</span>
                      ) : friends.some(f => f.id === res.id) ? (
                        <span className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-4">
                          <Check className="w-4 h-4" /> Friend
                        </span>
                      ) : outgoing.some(o => o.addressee_user_id === res.id) ? (
                        <span className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-widest px-4">
                          <Clock className="w-4 h-4" /> Pending
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleAddFriend(res.id)}
                          className="px-6 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'friends' && (
              friends.length === 0 ? (
                <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl opacity-40">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No friends yet</p>
                  <p className="text-[10px] mt-2">Add friends from your recent matches or search for them.</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <motion.div
                    key={friend.friendship_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-500 border border-emerald-500/20">
                          {friend.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#050505] ${
                          isOnline(friend.last_seen_at) ? 'bg-emerald-500' : 'bg-gray-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{friend.username}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          {isOnline(friend.last_seen_at) ? 'Online Now' : friend.last_seen_at ? `Last seen ${formatDistanceToNow(new Date(friend.last_seen_at), { addSuffix: true })}` : 'Offline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleRemove(friend.friendship_id)}
                        className="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                      >
                        <UserMinus className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )
            )}

            {activeTab === 'requests' && (
              <div className="space-y-8">
                {incoming.length > 0 && (
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 px-2">Incoming Requests</h2>
                    <div className="grid gap-3">
                      {incoming.map((req) => (
                        <div key={req.id} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center font-black text-emerald-500">
                              {req.requester.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-white uppercase italic tracking-tight">{req.requester.username}</h3>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Wants to be your friend</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleAccept(req.id)}
                              className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleReject(req.id)}
                              className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-500 transition-all"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outgoing.length > 0 && (
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 px-2">Sent Requests</h2>
                    <div className="grid gap-3">
                      {outgoing.map((req) => (
                        <div key={req.id} className="p-4 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between opacity-60">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-gray-400">
                              {req.addressee.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-white uppercase italic tracking-tight">{req.addressee.username}</h3>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Awaiting response</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {incoming.length === 0 && outgoing.length === 0 && (
                  <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl opacity-40">
                    <UserPlus className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No pending requests</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'opponents' && (
              recentOpponents.length === 0 ? (
                <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl opacity-40">
                  <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest">No recent opponents</p>
                  <p className="text-[10px] mt-2">Play some matches to see your opponents here.</p>
                </div>
              ) : (
                recentOpponents.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center font-black text-blue-500 border border-blue-500/20">
                          {opp.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#050505] ${
                          isOnline(opp.last_seen_at) ? 'bg-emerald-500' : 'bg-gray-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{opp.username}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                          Last matched {opp.last_match_at ? formatDistanceToNow(new Date(opp.last_match_at), { addSuffix: true }) : 'recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!friends.some(f => f.id === opp.id) && !outgoing.some(o => o.addressee_user_id === opp.id) && (
                        <button 
                          onClick={() => handleAddFriend(opp.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cliques;
