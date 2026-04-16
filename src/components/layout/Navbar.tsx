import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Gamepad2, LogOut, User, Users, HelpCircle, MessageSquare, Menu, X as CloseIcon } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import { motion, AnimatePresence } from 'motion/react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                    <Link 
                      key={link.to}
                      to={link.to} 
                      className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-emerald-500 transition-colors flex items-center gap-2"
                    >
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  ))}
                </div>
                
                <NotificationBell />

                <div className="h-6 w-px bg-neutral-800 mx-2 hidden sm:block" />

                <Link to="/dashboard" className="text-sm font-black uppercase italic tracking-tight hover:text-emerald-500 transition-colors flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:inline">{user.username}</span>
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
                  className="flex items-center gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-orange-500/50 transition-all"
                >
                  <link.icon className="w-6 h-6 text-orange-500" />
                  <span className="font-black uppercase tracking-widest text-sm">{link.label}</span>
                </Link>
              ))}
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
