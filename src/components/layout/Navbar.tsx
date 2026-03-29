import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Gamepad2, LogOut, User } from 'lucide-react';

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
                <Link to="/dashboard" className="text-sm font-medium hover:text-orange-500 transition-colors flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {user.username}
                </Link>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
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
