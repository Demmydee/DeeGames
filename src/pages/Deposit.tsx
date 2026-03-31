import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, CreditCard, AlertCircle, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

const Deposit = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/api/wallet/deposit/initiate', { amount: depositAmount });
      // Redirect to Paystack authorization URL
      window.location.href = response.data.authorization_url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate deposit. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-3xl font-black uppercase italic mb-2">Deposit Funds</h2>
          <p className="text-neutral-400">Add money to your DeeGames wallet</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-2 block">Amount (NGN)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-black text-xl">₦</span>
              <input
                type="number"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-4 pl-10 pr-4 text-2xl font-black focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[1000, 2000, 5000, 10000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val.toString())}
                  className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-black py-2 rounded-lg transition-all"
                >
                  +₦{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-100">Paystack Checkout</p>
              <p className="text-xs text-neutral-500">Secure payment via card, bank, or USSD</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed to Payment <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-neutral-500 text-xs">
          By proceeding, you agree to our payment terms. Minimum deposit is ₦100.
        </p>
      </motion.div>
    </div>
  );
};

export default Deposit;
