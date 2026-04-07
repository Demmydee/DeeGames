import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Gamepad2,
  Users,
  Wallet,
  Trophy,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { lobbyApi, gameRequestApi } from '../services/multiplayerApi';
import { RoomCategory, GameType } from '../types/multiplayer';

interface Props {
  room: RoomCategory;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateRequestModal: React.FC<Props> = ({ room, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    game_type_id: '',
    category: 'duel' as 'duel' | 'arena',
    pay_mode: 'knockout' as 'knockout' | 'split',
    amount: room.min_wager,
    required_players: 2
  });

  useEffect(() => {
    const fetchGameTypes = async () => {
      try {
        const data = await lobbyApi.getGameTypes();
        setGameTypes(data);
        if (data.length > 0) {
          setFormData(prev => ({
            ...prev,
            game_type_id: data[0].id,
            required_players: data[0].min_players
          }));
        }
      } catch (err: any) {
        setError('Failed to load game types');
      } finally {
        setLoading(false);
      }
    };

    fetchGameTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await gameRequestApi.create({
        ...formData,
        room_category_id: room.id
      });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
      setSubmitting(false);
    }
  };

  const selectedGame = gameTypes.find(g => g.id === formData.game_type_id);

  // Enforce rules when category or game type changes
  useEffect(() => {
    if (formData.category === 'duel') {
      setFormData(prev => ({
        ...prev,
        pay_mode: 'knockout',
        required_players: 2
      }));
    }
  }, [formData.category]);

  useEffect(() => {
    if (selectedGame) {
      setFormData(prev => ({
        ...prev,
        required_players: Math.max(selectedGame.min_players, Math.min(prev.required_players, selectedGame.max_players))
      }));
    }
  }, [formData.game_type_id, selectedGame]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-white uppercase italic tracking-tight">
              Create Game Request
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Request Created!</h3>
            <p className="text-gray-400 text-sm">Your game request is now live in the lobby.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
                {(error.toLowerCase().includes('balance') || error.toLowerCase().includes('insufficient')) && (
                  <button
                    type="button"
                    onClick={() => navigate('/wallet')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-emerald-900/20"
                  >
                    Deposit Now
                  </button>
                )}
              </div>
            )}

            {/* Game Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Gamepad2 className="w-3 h-3" />
                Select Game
              </label>
              <div className="grid grid-cols-2 gap-3">
                {loading ? (
                  <div className="col-span-2 py-4 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                ) : (
                  gameTypes.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, game_type_id: game.id })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.game_type_id === game.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-white'
                          : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/10'
                      }`}
                    >
                      <div className="font-bold text-sm mb-1">{game.name}</div>
                      <div className="text-[10px] opacity-60 uppercase tracking-wider">
                        {game.min_players}-{game.max_players} Players
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Players & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Players
                </label>
                <select
                  value={formData.required_players}
                  disabled={formData.category === 'duel'}
                  onChange={(e) => setFormData({ ...formData, required_players: parseInt(e.target.value) })}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
                >
                  {selectedGame ? (
                    Array.from({ length: selectedGame.max_players - selectedGame.min_players + 1 }, (_, i) => selectedGame.min_players + i).map(num => (
                      <option key={num} value={num} className="bg-[#0a0a0a]">{num} Players</option>
                    ))
                  ) : (
                    [2, 3, 4].map(num => (
                      <option key={num} value={num} className="bg-[#0a0a0a]">{num} Players</option>
                    ))
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Trophy className="w-3 h-3" />
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="duel" className="bg-[#0a0a0a]">Duel (1v1)</option>
                  <option value="arena" className="bg-[#0a0a0a]">Arena (Multiplayer)</option>
                </select>
              </div>
            </div>

            {/* Pay Mode */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Wallet className="w-3 h-3" />
                Payout Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pay_mode: 'knockout' })}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    formData.pay_mode === 'knockout'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/10'
                  }`}
                >
                  <div className="font-bold text-sm">Knockout</div>
                  <div className="text-[10px] opacity-60 uppercase tracking-wider">Winner takes all</div>
                </button>
                <button
                  type="button"
                  disabled={formData.category === 'duel' || formData.required_players <= 2}
                  onClick={() => setFormData({ ...formData, pay_mode: 'split' })}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    formData.pay_mode === 'split'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/10 disabled:opacity-30'
                  }`}
                >
                  <div className="font-bold text-sm">Split</div>
                  <div className="text-[10px] opacity-60 uppercase tracking-wider">Top players share</div>
                </button>
              </div>
              {formData.category === 'duel' && (
                <p className="text-[10px] text-emerald-500/60 uppercase tracking-wider">Duel is always knockout</p>
              )}
            </div>

            {/* Wager Amount */}
            {!room.is_free && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-3 h-3" />
                  Wager Amount (₦)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.amount === 0 ? '' : formData.amount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                      setFormData({ ...formData, amount: isNaN(val) ? 0 : val });
                    }}
                    min={room.min_wager}
                    max={room.max_wager || undefined}
                    placeholder="0"
                    className="w-full p-3 pl-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₦</span>
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Min: ₦{room.min_wager.toLocaleString()} {room.max_wager ? `| Max: ₦${room.max_wager.toLocaleString()}` : ''}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase italic tracking-widest transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Request</span>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default CreateRequestModal;

// Helper component for Plus icon
const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
