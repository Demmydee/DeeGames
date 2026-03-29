import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Trophy, History, Settings, Gamepad2, ArrowUpRight, ArrowDownLeft, User } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Wallet Balance', value: '₦0.00', icon: Wallet, color: 'text-green-500' },
    { label: 'Games Won', value: '0', icon: Trophy, color: 'text-orange-500' },
    { label: 'Total Wagered', value: '₦0.00', icon: History, color: 'text-blue-500' },
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-neutral-950 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-neutral-500 text-sm font-medium mb-1">{stat.label}</p>
            <p className="text-3xl font-black">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-orange-500" />
              Active Game Rooms
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-12 text-center">
              <p className="text-neutral-500 mb-6">No active game rooms available in Phase 1.</p>
              <button className="bg-neutral-800 text-neutral-400 px-6 py-3 rounded-full font-bold cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <History className="w-6 h-6 text-orange-500" />
              Recent Activity
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
              <div className="p-8 text-center text-neutral-500">
                Your recent game and transaction history will appear here.
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-orange-600 rounded-3xl p-6 text-white">
            <h3 className="text-xl font-black uppercase mb-4">Quick Deposit</h3>
            <p className="text-orange-100 text-sm mb-6">Fund your wallet to start wagering against other players.</p>
            <button className="w-full bg-white text-orange-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors">
              <ArrowUpRight className="w-5 h-5" />
              Deposit Now
            </button>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
            <h3 className="text-xl font-bold mb-4">Account Settings</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-300">
                <span className="flex items-center gap-3">
                  <User className="w-5 h-5" /> Profile
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
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

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default Dashboard;
