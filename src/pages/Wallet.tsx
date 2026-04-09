import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet as WalletIcon, Plus, Minus, History, CreditCard, ShieldCheck, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';
import WalletSummary from '../components/wallet/WalletSummary';
import TransactionList from '../components/wallet/TransactionList';
import { Link, useNavigate } from 'react-router-dom';

import ErrorMessage from '../components/ui/ErrorMessage';

const Wallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [walletRes, txRes, kycRes] = await Promise.all([
        apiClient.get('/api/wallet'),
        apiClient.get('/api/wallet/transactions/recent'),
        apiClient.get('/api/kyc/status')
      ]);
      setWallet(walletRes.data.wallet);
      setTransactions(txRes.data.transactions);
      setKycStatus(kycRes.data);
    } catch (err: any) {
      console.error('Failed to fetch wallet data', err);
      setError('Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-orange-500">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic flex items-center gap-3">
            <WalletIcon className="w-10 h-10 text-orange-500" />
            My Wallet
          </h1>
          <p className="text-neutral-500 mt-1">Manage your funds and transaction history</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/deposit"
            className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Deposit
          </Link>
          <Link
            to="/withdraw"
            className="flex-1 md:flex-none bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Minus className="w-5 h-5" /> Withdraw
          </Link>
        </div>
      </div>

      <ErrorMessage message={error} className="mb-8" />

      <WalletSummary
        available={wallet?.available_balance || 0}
        locked={wallet?.locked_balance || 0}
        total={wallet?.total_balance || 0}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black uppercase italic flex items-center gap-2">
              <History className="w-6 h-6 text-orange-500" />
              Recent Transactions
            </h2>
            <Link to="/transactions" className="text-orange-500 text-sm font-bold hover:underline">View All</Link>
          </div>
          <TransactionList transactions={transactions} loading={loading} />
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-lg">
            <h3 className="text-xl font-black uppercase italic mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" />
              Payout Accounts
            </h3>
            <p className="text-neutral-500 text-sm mb-6">Manage your bank accounts for withdrawals.</p>
            <Link
              to="/payout-accounts"
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Manage Accounts
            </Link>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-lg">
            <h3 className="text-xl font-black uppercase italic mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
              KYC Status
            </h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-500 text-sm">Status:</span>
              <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                kycStatus?.status === 'verified' ? 'bg-green-500/10 text-green-500' :
                kycStatus?.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                'bg-red-500/10 text-red-500'
              }`}>
                {kycStatus?.status || 'Unverified'}
              </span>
            </div>
            <p className="text-neutral-500 text-xs italic mb-6">
              {kycStatus?.withdrawalsAllowed ? 'Withdrawals are enabled for your account.' : 'Withdrawal is restricted until KYC is verified.'}
            </p>
            {kycStatus?.status !== 'verified' && (
              <button className="w-full bg-orange-600/10 hover:bg-orange-600/20 text-orange-500 font-bold py-3 rounded-xl transition-all border border-orange-500/30">
                Complete Verification
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
