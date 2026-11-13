import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Dices, Layers, Crown, Play, Loader2, Clock, AlertCircle } from 'lucide-react';
import { demoApi } from '../services/multiplayerApi';

interface InstantDemoSectionProps {
  compact?: boolean;
}

const InstantDemoSection: React.FC<InstantDemoSectionProps> = ({ compact = false }) => {
  const navigate = useNavigate();
  const [whotVariant, setWhotVariant] = useState<'classic' | 'scored'>('classic');
  const [diceVariant, setDiceVariant] = useState<'sudden_drop' | 'marathon'>('sudden_drop');
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePlayBot = async (gameType: 'whot' | 'ludo' | 'dice', variant: string) => {
    setError(null);
    setLaunching(gameType);
    try {
      const match = await demoApi.createMatch(gameType, variant);
      navigate(`/match/${match.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to launch Instant Demo Room');
      setLaunching(null);
    }
  };

  return (
    <section className={compact ? 'space-y-4' : 'mb-12'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white">
              Instant Demo Room · Play vs Bot
            </h2>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Launch any available game immediately against DeeBot AI — no opponents or wallet balance needed.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Whot */}
        <div className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Available</span>
            </div>
            <h3 className="text-lg font-black uppercase italic text-white mb-1">Whot</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Fast Nigerian card game with action cards, general market &amp; wild 20s.
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => setWhotVariant('classic')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors whitespace-nowrap ${
                  whotVariant === 'classic'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Classic
              </button>
              <button
                type="button"
                onClick={() => setWhotVariant('scored')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors whitespace-nowrap ${
                  whotVariant === 'scored'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Scored
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={launching !== null}
            onClick={() => handlePlayBot('whot', whotVariant)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            {launching === 'whot' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Play vs Bot</span>
          </button>
        </div>

        {/* Ludo */}
        <div className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Crown className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Available</span>
            </div>
            <h3 className="text-lg font-black uppercase italic text-white mb-1">Ludo</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Race all 4 tokens home, capture opponents on unsafe squares &amp; roll 6s.
            </p>
            <div className="mb-4">
              <div className="py-1.5 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-emerald-500/15 border-emerald-500/50 text-emerald-400 text-center">
                Classic Mode
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={launching !== null}
            onClick={() => handlePlayBot('ludo', 'classic')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            {launching === 'ludo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Play vs Bot</span>
          </button>
        </div>

        {/* Dice */}
        <div className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Dices className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Available</span>
            </div>
            <h3 className="text-lg font-black uppercase italic text-white mb-1">Dice</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Quick high-roll showdown. Outroll DeeBot in Sudden Drop or 5-round Marathon.
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-4">
              <button
                type="button"
                onClick={() => setDiceVariant('sudden_drop')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors whitespace-nowrap ${
                  diceVariant === 'sudden_drop'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Sudden Drop
              </button>
              <button
                type="button"
                onClick={() => setDiceVariant('marathon')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors whitespace-nowrap ${
                  diceVariant === 'marathon'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Marathon
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={launching !== null}
            onClick={() => handlePlayBot('dice', diceVariant)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            {launching === 'dice' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>Play vs Bot</span>
          </button>
        </div>

        {/* Chess - Coming Soon */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between opacity-75">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-neutral-800 text-neutral-500 border border-neutral-700/60">
                <Clock className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                Coming Soon
              </span>
            </div>
            <h3 className="text-lg font-black uppercase italic text-neutral-300 mb-1">Chess</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Temporarily paused for engine fixes and clock tuning. Check back soon.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="w-full py-2.5 px-4 bg-neutral-800 text-neutral-500 rounded-xl font-black uppercase tracking-widest text-xs cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Clock className="w-4 h-4" />
            <span>Coming Soon</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default InstantDemoSection;
