import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Gamepad2, LogOut, User, Users, HelpCircle, MessageSquare, Menu, Settings, X as CloseIcon } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import { motion, AnimatePresence } from 'motion/react';
import { friendApi } from '../../services/multiplayerApi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [cliquesHovered, setCliquesHovered] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchFriends = async () => {
      try {
        const data = await friendApi.getFriends();
        setFriends(data);
      } catch (err) {
        console.error('Navbar: failed to load friends:', err);
      }
    };
    fetchFriends();

    // Poll every 10 seconds to keep navbar badge live
    const interval = setInterval(fetchFriends, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const isOnline = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return false;
    const lastSeenDate = new Date(lastSeenAt);
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  const navLinks = [
    { to: '/cliques', label: 'Cliques', icon: Users },
    { to: '/faq', label: 'FAQ', icon: HelpCircle },
    { to: '/support', label: 'Support', icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group" onClick={() => setIsMenuOpen(false)}>
            <Gamepad2 className="w-8 h-8 text-orange-500 group-hover:rotate-12 transition-transform" />
            <span className="text-2xl font-black tracking-tighter uppercase italic">DeeGames</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-6 mr-4">
                  {navLinks.map((link) => (
                    <div
                      key={link.to}
                      className="relative py-2"
                      onMouseEnter={() => link.to === '/cliques' && setCliquesHovered(true)}
                      onMouseLeave={() => link.to === '/cliques' && setCliquesHovered(false)}
                    >
                      <Link
                        to={link.to}
                        className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-emerald-500 transition-colors flex items-center gap-2"
                      >
                        <link.icon className="w-4 h-4" />
                        <span>{link.label}</span>
                        {link.to === '/cliques' && (
                          <span className="flex items-center gap-1 bg-emerald-500/10 text-[9px] font-black text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full select-none">
                            <span className="relative flex h-1.5 w-1.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span>{friends.filter(f => isOnline(f.last_seen_at)).length}/{friends.length}</span>
                          </span>
                        )}
                      </Link>

                      {link.to === '/cliques' && (
                        <AnimatePresence>
                          {cliquesHovered && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl z-50 p-3 max-h-72 flex flex-col pointer-events-auto text-left"
                            >
                              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Cliques list</span>
                                <Link to="/cliques" className="text-[9px] font-bold text-emerald-500 hover:underline uppercase tracking-wider font-extrabold pb-0.5">View all</Link>
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
                                              {friend.avatar_url ? (
                                                <img
                                                  src={friend.avatar_url}
                                                  alt={friend.username}
                                                  referrerPolicy="no-referrer"
                                                  className="w-6 h-6 rounded-lg object-cover border border-white/10"
                                                />
                                              ) : (
                                                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black text-[10px] text-emerald-500 border border-emerald-500/20">
                                                  {(friend.username || 'UN').substring(0, 2).toUpperCase()}
                                                </div>
                                              )}
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
                      )}
                    </div>
                  ))}
                </div>

                <NotificationBell />

                <div className="h-6 w-px bg-neutral-800 mx-2 hidden sm:block" />

                <Link to="/dashboard" className="text-sm font-black uppercase italic tracking-tight hover:text-emerald-500 transition-colors flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden sm:inline">{user.username}</span>
                </Link>

                <Link
                  to="/profile"
                  className="hidden sm:flex p-2 rounded-lg hover:bg-orange-500/10 text-neutral-500 hover:text-orange-500 transition-all"
                  title="Profile Settings"
                >
                  <Settings className="w-5 h-5" />
                </Link>

                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 md:hidden transition-colors"
                >
                  {isMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                <button
                  onClick={logout}
                  className="hidden sm:flex p-2 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-500 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium hover:text-orange-500 transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold transition-all transform hover:scale-105 active:scale-95"
                >
                  Join Now
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-neutral-800 bg-neutral-950 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-orange-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <link.icon className="w-6 h-6 text-orange-500" />
                    <span className="font-black uppercase tracking-widest text-sm">{link.label}</span>
                  </div>
                  {link.to === '/cliques' && (
                    <span className="flex items-center gap-1.5 bg-emerald-500/10 text-[10px] font-black text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full pointer-events-none">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span>{friends.filter(f => isOnline(f.last_seen_at)).length}/{friends.length}</span>
                    </span>
                  )}
                </Link>
              ))}
              <Link
                to="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-orange-500/50 transition-all"
              >
                <Settings className="w-6 h-6 text-orange-500" />
                <span className="font-black uppercase tracking-widest text-sm">Profile Settings</span>
              </Link>
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-6 h-6" />
                <span className="font-black uppercase tracking-widest text-sm">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
