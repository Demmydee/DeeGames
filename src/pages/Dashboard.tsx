import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  Trophy,
  History,
  Settings,
  Gamepad2,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  ChevronRight,
  Building2,
  Loader2,
  AlertCircle,
  Play,
  Users,
  HelpCircle,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { dashboardApi, socialApi, friendApi } from '../services/multiplayerApi';
import { DashboardStatus } from '../types/multiplayer';

import ErrorMessage from '../components/ui/ErrorMessage';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [status, setStatus] = useState<DashboardStatus | null>(null);
  const [recentOpponents, setRecentOpponents] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendsHovered, setFriendsHovered] = useState(false);
  const [showFriendsPopup, setShowFriendsPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          apiClient.get('/api/wallet'),
          dashboardApi.getStatus(),
          socialApi.getRecentOpponents(),
          friendApi.getFriends()
        ]);

        // Handle Wallet
        if (results[0].status === 'fulfilled') {
          setWallet(results[0].value.data.wallet);
        } else {
          console.error('Wallet fetch error:', results[0].reason);
        }

        // Handle Status
        if (results[1].status === 'fulfilled') {
          setStatus(results[1].value);
        } else {
          console.error('Status fetch error:', results[1].reason);
        }

        // Handle Opponents
        if (results[2].status === 'fulfilled') {
          setRecentOpponents(results[2].value.slice(0, 3));
        } else {
          console.error('Opponents fetch error:', results[2].reason);
        }

        // Handle Friends
        if (results[3].status === 'fulfilled') {
          setFriends(results[3].value);
        } else {
          console.error('Friends fetch error:', results[3].reason);
        }
      } catch (error: any) {
        console.error('Unexpected dashboard error:', error);
        setError('An unexpected error occurred. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddFriend = async (userId: string) => {
    try {
      await friendApi.sendRequest(userId);
      alert('Friend request sent!');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const stats = [
    { label: 'Wallet Balance', value: loading ? '...' : formatCurrency(wallet?.available_balance || 0), icon: Wallet, color: 'text-green-500', link: '/wallet' },
    { label: 'Games Won', value: '0', icon: Trophy, color: 'text-orange-500', link: '#' },
    { label: 'Total Wagered', value: '₦0.00', icon: History, color: 'text-blue-500', link: '#' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-black uppercase italic mb-2">
          Welcome back, <span className="text-orange-500">{user?.username}</span>!
        </h1>
        <p className="text-neutral-400">Ready for your next challenge?</p>
      </motion.div>

      <ErrorMessage message={error} className="mb-8" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl group hover:border-orange-500/50 transition-all"
          >
            <Link to={stat.link} className="block">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-neutral-950 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-neutral-700 group-hover:text-orange-500 transition-colors" />
              </div>
              <p className="text-neutral-500 text-sm font-medium mb-1">{stat.label}</p>
              <p className="text-3xl font-black">{stat.value}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-orange-500" />
              Multiplayer Arena
            </h2>

            {status?.active ? (
              <div className="bg-neutral-900 border border-orange-500/30 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="p-4 rounded-2xl bg-orange-500/10 text-orange-500">
                    {status.type === 'match' ? <Play className="w-8 h-8" /> : <Loader2 className="w-8 h-8 animate-spin" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {status.type === 'match' ? 'Active Match' : 'Awaiting Opponents'}
                    </h3>
                    <p className="text-neutral-400 text-sm">
                      {status.details?.game_type?.name} in {status.details?.room?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(status.type === 'match' ? `/match/${status.id}` : `/lobby/room/${status.details?.room_category_id}`)}
                  className="px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20"
                >
                  {status.type === 'match' ? 'Rejoin Match' : 'View Request'}
                </button>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
                <p className="text-neutral-500 mb-6">You are not currently in any active game or request.</p>
                <Link
                  to="/lobby"
                  className="inline-block bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg shadow-orange-900/20"
                >
                  Enter Lobby
                </Link>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-orange-500" />
                Recent Opponents
              </div>
              <Link to="/cliques" className="text-sm text-orange-500 hover:underline font-bold uppercase tracking-widest">View All</Link>
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
              {recentOpponents.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  Your recent opponents will appear here after you play some matches.
                </div>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {recentOpponents.map((opp) => (
                    <div key={opp.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center font-black text-orange-500">
                          {opp.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{opp.username}</h4>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Matched recently</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFriend(opp.id)}
                        className="p-2 rounded-lg bg-neutral-800 hover:bg-orange-600 text-neutral-400 hover:text-white transition-all"
                        title="Add Friend"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-orange-600 rounded-3xl p-6 text-white">
            <h3 className="text-xl font-black uppercase mb-4">Quick Deposit</h3>
            <p className="text-orange-100 text-sm mb-6">Fund your wallet to start wagering against other players.</p>
            <Link
              to="/deposit"
              className="w-full bg-white text-orange-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
            >
              <ArrowUpRight className="w-5 h-5" />
              Deposit Now
            </Link>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
            <h3 className="text-xl font-bold mb-4">Quick Navigation</h3>
            <div className="space-y-2">
              <div
                className="relative"
                onMouseEnter={() => setFriendsHovered(true)}
                onMouseLeave={() => setFriendsHovered(false)}
              >
                <div className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-300">
                  <Link to="/cliques" className="flex items-center gap-3 flex-1">
                    <Users className="w-5 h-5 animate-pulse text-emerald-500" />
                    <span>Cliques</span>
                  </Link>
                  <div className="flex items-center gap-2 relative z-50">
                    <button
                      onClick={() => setShowFriendsPopup(!showFriendsPopup)}
                      className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-[10px] font-black text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative" />
                      <span>{friends.filter(f => isOnline(f.last_seen_at)).length}/{friends.length}</span>
                    </button>
                    <Link to="/cliques">
                      <ChevronRight className="w-4 h-4 text-neutral-500" />
                    </Link>
                  </div>
                </div>

                {showFriendsPopup && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFriendsPopup(false)}
                  />
                )}

                <AnimatePresence>
                  {(friendsHovered || showFriendsPopup) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 bottom-full mb-2 w-64 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl z-50 p-3 max-h-72 flex flex-col pointer-events-auto"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Friends list</span>
                        <Link to="/cliques" className="text-[9px] font-bold text-emerald-500 hover:underline uppercase tracking-wider font-extrabold">View all</Link>
                      </div>
                      <div className="overflow-y-auto space-y-1.5 flex-1 min-h-0 pr-1 select-none">
                        {friends.length === 0 ? (
                          <div className="text-center py-4 text-[10px] text-neutral-500">
                            No friends yet. Find opponents or search for users!
                          </div>
                        ) : (
                          [...friends]
                            .sort((a, b) => {
                              const aOn = isOnline(a.last_seen_at);
                              const bOn = isOnline(b.last_seen_at);
                              if (aOn && !bOn) return -1;
                              if (!aOn && bOn) return 1;
                              return (a.username || '').localeCompare(b.username || '');
                            })
                            .map((friend) => {
                              const online = isOnline(friend.last_seen_at);
                              return (
                                <div key={friend.id} className="flex items-center justify-between p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                                  <div className="flex items-center gap-2 max-w-[70%]">
                                    <div className="relative shrink-0">
                                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black text-[10px] text-emerald-500 border border-emerald-500/20">
                                        {(friend.username || 'UN').substring(0, 2).toUpperCase()}
                                      </div>
                                      <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-neutral-950 ${
                                        online ? 'bg-emerald-500' : 'bg-neutral-600'
                                      }`} />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-200 truncate">{friend.username}</span>
                                  </div>
                                  <span className={`text-[8px] font-black uppercase tracking-wider ${online ? 'text-emerald-500' : 'text-neutral-500'}`}>
                                    {online ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Link to="/faq" className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-300">
                <span className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5" /> FAQ
                </span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link to="/support" className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-300">
                <span className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" /> Support
                </span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
            <h3 className="text-xl font-bold mb-4">Account Settings</h3>
            <div className="space-y-2">
              <Link to="/wallet" className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-300">
                <span className="flex items-center gap-3">
                  <Wallet className="w-5 h-5" /> Wallet
                </span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link to="/payout-accounts" className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-300">
                <span className="flex items-center gap-3">
                  <Building2 className="w-5 h-5" /> Payout Accounts
                </span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-300">
                <span className="flex items-center gap-3">
                  <Settings className="w-5 h-5" /> Security
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
