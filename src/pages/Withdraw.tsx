import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Minus, Building2, AlertCircle, ArrowRight, Loader2, Plus, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';
import { useNavigate, Link } from 'react-router-dom';

const Withdraw = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [payoutAccounts, setPayoutAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, walletRes] = await Promise.all([
          apiClient.get('/api/payout-accounts'),
          apiClient.get('/api/wallet')
        ]);
        setPayoutAccounts(accountsRes.data.accounts);
        setWallet(walletRes.data.wallet);

        const defaultAccount = accountsRes.data.accounts.find((a: any) => a.is_default);
        if (defaultAccount) {
          setSelectedAccountId(defaultAccount.id);
        } else if (accountsRes.data.accounts.length > 0) {
          setSelectedAccountId(accountsRes.data.accounts[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setFetchingAccounts(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!selectedAccountId) {
      setError('Please select or add a payout account');
      setLoading(false);
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      await apiClient.post('/api/wallet/withdraw', {
        amount: withdrawAmount,
        payoutAccountId: selectedAccountId
      });
      navigate('/wallet');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit withdrawal request. Please try again.');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
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
            <Minus className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-3xl font-black uppercase italic mb-2">Withdraw Funds</h2>
          <p className="text-neutral-400">Transfer money to your bank account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 block">Amount (NGN)</label>
              <span className="text-xs text-neutral-500">Available: {formatCurrency(wallet?.available_balance || 0)}</span>
            </div>
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
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 block">Payout Account</label>
              <Link to="/payout-accounts" className="text-xs text-orange-500 font-bold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Account
              </Link>
            </div>
            {fetchingAccounts ? (
              <div className="h-16 bg-neutral-950 border border-neutral-800 rounded-xl animate-pulse" />
            ) : payoutAccounts.length === 0 ? (
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-center">
                <p className="text-neutral-500 text-sm italic mb-2">No payout accounts found.</p>
                <Link to="/payout-accounts" className="text-orange-500 text-sm font-bold hover:underline">Add one now</Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {payoutAccounts.map((account) => (
                  <label
                    key={account.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedAccountId === account.id ? 'bg-orange-600/10 border-orange-500' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payoutAccount"
                      className="hidden"
                      checked={selectedAccountId === account.id}
                      onChange={() => setSelectedAccountId(account.id)}
                    />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedAccountId === account.id ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-neutral-100 truncate">{account.account_name}</p>
                      <p className="text-xs text-neutral-500 truncate">{account.bank_name} • {account.account_number}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || payoutAccounts.length === 0}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Request Withdrawal <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-neutral-500 text-xs">
          Withdrawal requests are processed within 24-48 hours. Minimum withdrawal is ₦500.
        </p>
      </motion.div>
    </div>
  );
};

export default Withdraw;
