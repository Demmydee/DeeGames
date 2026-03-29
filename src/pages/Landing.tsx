import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Zap, Trophy, Users, ChevronRight, Gamepad2 } from 'lucide-react';

const Landing = () => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-600/20 to-neutral-950 z-10" />
          <img
            src="https://picsum.photos/seed/gaming/1920/1080?blur=4"
            alt="Gaming background"
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic mb-6 leading-none">
              The Future of <span className="text-orange-500">P2P Gaming</span>
            </h1>
            <p className="text-xl md:text-2xl text-neutral-400 mb-10 font-light max-w-2xl mx-auto">
              Wager against real players in your favorite games. Whot, Ludo, Chess, and more. 
              Secure, fair, and built for winners.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-full text-lg font-black uppercase tracking-wider transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Playing <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="border border-neutral-700 hover:border-neutral-500 bg-neutral-900/50 backdrop-blur-sm px-8 py-4 rounded-full text-lg font-black uppercase tracking-wider transition-all"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-neutral-950 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 transition-colors group">
              <Zap className="w-12 h-12 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-4">Instant Payouts</h3>
              <p className="text-neutral-400">Win a game, get paid instantly. No waiting periods, no hidden fees. Your money, your rules.</p>
            </div>
            <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 transition-colors group">
              <Shield className="w-12 h-12 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-4">Secure & Fair</h3>
              <p className="text-neutral-400">Anti-cheat systems and secure escrow ensure every wager is handled with absolute integrity.</p>
            </div>
            <div className="p-8 rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 transition-colors group">
              <Users className="w-12 h-12 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-4">Global Community</h3>
              <p className="text-neutral-400">Challenge players from around the world or invite your friends for a private high-stakes match.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Games Teaser */}
      <section className="py-24 bg-neutral-900 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-4xl md:text-5xl font-black uppercase italic mb-6">Coming Soon to <span className="text-orange-500">DeeGames</span></h2>
              <ul className="space-y-4">
                {['Whot', 'Ludo', 'Chess', 'Dice Roll', 'Snakes & Ladders'].map((game) => (
                  <li key={game} className="flex items-center gap-3 text-xl font-bold text-neutral-300">
                    <Trophy className="w-6 h-6 text-orange-500" />
                    {game}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 relative">
              <div className="grid grid-cols-2 gap-4">
                <img src="https://picsum.photos/seed/chess/400/400" alt="Chess" className="rounded-2xl rotate-3 hover:rotate-0 transition-transform" referrerPolicy="no-referrer" />
                <img src="https://picsum.photos/seed/dice/400/400" alt="Dice" className="rounded-2xl -rotate-3 hover:rotate-0 transition-transform mt-8" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-800 bg-neutral-950 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-orange-500" />
            <span className="text-xl font-black tracking-tighter uppercase italic">DeeGames</span>
          </div>
          <div className="flex gap-8 text-sm text-neutral-500">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Responsible Gaming</a>
          </div>
          <p className="text-sm text-neutral-600">© 2026 DeeGames. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
