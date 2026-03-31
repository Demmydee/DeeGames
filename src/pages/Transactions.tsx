import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, Search, Filter, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';
import TransactionList from '../components/wallet/TransactionList';
import { useNavigate } from 'react-router-dom';

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const fetchTransactions = async (p: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/wallet/transactions?limit=${limit}&offset=${p * limit}`);
      const newTransactions = response.data.transactions;
      setTransactions(newTransactions);
      setHasMore(newTransactions.length === limit);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(page);
  }, [page]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic flex items-center gap-3">
            <History className="w-10 h-10 text-orange-500" />
            Transaction History
          </h1>
          <p className="text-neutral-500 mt-1">A complete record of your financial activities</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search reference..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-orange-500 outline-none transition-all"
            />
          </div>
          <button className="bg-neutral-900 border border-neutral-800 p-2 rounded-xl text-neutral-500 hover:text-orange-500 transition-all">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl shadow-lg">
        <TransactionList transactions={transactions} loading={loading} />
        
        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">
            Showing Page {page + 1}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0 || loading}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasMore || loading}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
