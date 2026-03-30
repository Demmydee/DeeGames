import React from 'react';

interface WalletSummaryProps {
  available: number;
  locked: number;
  total: number;
  currency?: string;
}

const WalletSummary: React.FC<WalletSummaryProps> = ({ available, locked, total, currency = 'NGN' }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-lg">
        <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider mb-1">Available Balance</p>
        <h3 className="text-3xl font-black text-orange-500">{formatCurrency(available)}</h3>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-lg">
        <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider mb-1">Locked Balance</p>
        <h3 className="text-3xl font-black text-neutral-300">{formatCurrency(locked)}</h3>
      </div>
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-orange-600/10 to-transparent">
        <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider mb-1">Total Balance</p>
        <h3 className="text-3xl font-black text-white">{formatCurrency(total)}</h3>
      </div>
    </div>
  );
};

export default WalletSummary;
