import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Bot, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GuestRestrictedNoticeProps {
  featureName: string;
  description?: string;
}

const GuestRestrictedNotice: React.FC<GuestRestrictedNoticeProps> = ({ featureName, description }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleRegister = () => {
    logout();
    navigate('/register');
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-500">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">
            Guest Demo Limitation
          </p>
          <h1 className="text-2xl font-black uppercase italic text-white mb-2">
            {featureName} Requires an Account
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {description ||
              'Guest demo sessions can play Whot, Ludo, and Dice for free against DeeBot AI, but wallet funding, payouts, cliques, profile edits, and live wagered PvP require a registered account.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Bot className="w-4 h-4 shrink-0" />
            <span>Play vs Bot</span>
          </button>
          <button
            type="button"
            onClick={handleRegister}
            className="flex-1 py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>Create Account</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestRestrictedNotice;
