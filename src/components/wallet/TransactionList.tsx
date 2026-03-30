import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: string;
  direction: 'credit' | 'debit';
  amount: number;
  status: string;
  reference: string;
  description: string;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, loading }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'successful': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-neutral-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'successful': return 'text-green-500 bg-green-500/10';
      case 'failed': return 'text-red-500 bg-red-500/10';
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      case 'cancelled': return 'text-neutral-500 bg-neutral-500/10';
      default: return 'text-neutral-500 bg-neutral-500/10';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <p className="text-neutral-500 italic">No transactions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div key={tx.id} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl hover:border-neutral-700 transition-all flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.direction === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
              {tx.direction === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold text-neutral-100 capitalize">{tx.transaction_type.replace('_', ' ')}</p>
              <p className="text-xs text-neutral-500">{format(new Date(tx.created_at), 'MMM dd, yyyy • HH:mm')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-black text-lg ${tx.direction === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
              {tx.direction === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
            </p>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(tx.status)}`}>
              {getStatusIcon(tx.status)}
              {tx.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
