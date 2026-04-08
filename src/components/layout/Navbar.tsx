import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Gamepad2, LogOut, User, Users, HelpCircle, MessageSquare } from 'lucide-react';
import NotificationBell from '../NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <Gamepad2 className="w-8 h-8 text-orange-500 group-hover:rotate-12 transition-transform" />
            <span className="text-2xl font-black tracking-tighter uppercase italic">DeeGames</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-6 mr-4">
                  <Link to="/cliques" className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Cliques
                  </Link>
                  <Link to="/faq" className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    FAQ
                  </Link>
                  <Link to="/support" className="text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Support
                  </Link>
                </div>
                
                <NotificationBell />

                <div className="h-6 w-px bg-neutral-800 mx-2" />

                <Link to="/dashboard" className="text-sm font-black uppercase italic tracking-tight hover:text-emerald-500 transition-colors flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:inline">{user.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-500 transition-all"
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
    </nav>
  );
};

export default Navbar;
