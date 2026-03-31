import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2, Plus, Trash2, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import apiClient from '../api/client';
import { useNavigate } from 'react-router-dom';

const PayoutAccounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    bank_name: '',
    bank_code: '',
    account_number: '',
    is_default: false,
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/payout-accounts');
      setAccounts(response.data.accounts);
    } catch (err) {
      console.error('Failed to fetch payout accounts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await apiClient.post('/api/payout-accounts', formData);
      setFormData({
        account_name: '',
        bank_name: '',
        bank_code: '',
        account_number: '',
        is_default: false,
      });
      setShowForm(false);
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save payout account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payout account?')) return;

    try {
      await apiClient.delete(`/api/payout-accounts/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to delete payout account', err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.put(`/api/payout-accounts/${id}`, { is_default: true });
      fetchAccounts();
    } catch (err) {
      console.error('Failed to set default account', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors font-bold uppercase tracking-wider text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic flex items-center gap-3">
            <Building2 className="w-10 h-10 text-orange-500" />
            Payout Accounts
          </h1>
          <p className="text-neutral-500 mt-1">Manage your bank accounts for withdrawals</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2"
        >
          {showForm ? 'Cancel' : <><Plus className="w-5 h-5" /> Add Account</>}
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-lg mb-8"
        >
          <h2 className="text-2xl font-black uppercase italic mb-6">Add New Account</h2>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-2 block">Account Name</label>
              <input
                type="text"
                required
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-2 block">Account Number</label>
              <input
                type="text"
                required
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                placeholder="0123456789"
              />
            </div>
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-2 block">Bank Name</label>
              <input
                type="text"
                required
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                placeholder="Access Bank"
              />
            </div>
            <div>
              <label className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-2 block">Bank Code (Optional)</label>
              <input
                type="text"
                value={formData.bank_code}
                onChange={(e) => setFormData({ ...formData, bank_code: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                placeholder="044"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">Set as default payout account</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Account'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-24 bg-neutral-900 border border-neutral-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-3xl">
            <p className="text-neutral-500 italic">No payout accounts saved yet.</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl flex items-center justify-between group hover:border-neutral-700 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-neutral-950 rounded-2xl flex items-center justify-center text-orange-500">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-neutral-100">{account.account_name}</h3>
                    {account.is_default && (
                      <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-500 font-bold">{account.bank_name} • {account.account_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {!account.is_default && (
                  <button
                    onClick={() => handleSetDefault(account.id)}
                    className="text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-orange-500 transition-colors"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(account.id)}
                  className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PayoutAccounts;
