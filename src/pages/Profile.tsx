import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { motion } from 'motion/react';
import { User, Shield, Phone, Mail, UserCheck, Save, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80', // Gamer 1
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', // Gamer 2
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80', // Gamer 3
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', // Gamer 4
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80', // Gamer 5
  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&auto=format&fit=crop&q=80', // Gamer 6
];

export default function Profile() {
  const { user, updateUser, refreshUser } = useAuth();

  // Guard if not loaded
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-neutral-400 mb-4 font-bold uppercase tracking-widest text-sm">Loading user session...</p>
        </div>
      </div>
    );
  }

  const [username, setUsername] = useState(user.username || '');
  const [fullName, setFullName] = useState(user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const response = await apiClient.put('/api/auth/profile', {
        username: username.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });

      if (response.data?.user) {
        updateUser(response.data.user);
        setSuccessMsg('Your profile has been updated successfully!');
        // Refresh session in background
        await refreshUser();
      } else {
        throw new Error('Could not read user update response');
      }
    } catch (err: any) {
      console.error('Failed updating profile:', err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getKycBadge = (status?: string | null) => {
    const s = status ? status.toLowerCase() : 'pending';
    if (s === 'verified') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-black uppercase tracking-wider">
          <UserCheck className="w-3.5 h-3.5" />
          Verified
        </span>
      );
    }
    if (s === 'rejected') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-black uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-black uppercase tracking-wider">
        <Shield className="w-3.5 h-3.5 animate-pulse" />
        Verification Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Banner header */}
        <div className="relative mb-8 rounded-3xl bg-neutral-900 border border-neutral-800 p-6 md:p-8 overflow-hidden flex flex-col md:flex-row items-center gap-6 justify-between select-none">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent opacity-40 pointer-events-none" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-orange-500/30 shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-orange-600/10 flex items-center justify-center font-black text-2xl text-orange-500 border-2 border-orange-500/30">
                  {(username || 'DG').substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
                  {fullName || username}
                </h1>
                {getKycBadge((user as any).kyc_status)}
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-1">@{username}</p>
              <p className="text-[10px] uppercase font-black tracking-widest text-orange-500 mt-2">
                Member Since {new Date(user.created_at as string || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Main profile form */}
          <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <h2 className="text-lg font-black uppercase tracking-wider text-neutral-200 mb-6 border-b border-white/5 pb-3">
              Profile Settings
            </h2>

            <form onSubmit={handleUpdate} className="space-y-5">

              {/* Alert Notifications */}
              {successMsg && (
                <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-sans">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold font-sans">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                    Username *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all font-sans"
                      placeholder="Gamer tag..."
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500 mt-1.5">3-15 chars, letter, digits, underscore.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                    Display Name / Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all font-sans"
                      placeholder="Epic Player name..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all font-sans"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              {/* Avatar Selector Option */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">
                  Choose Game Avatar
                </label>
                <div className="grid grid-cols-6 gap-3 mb-4">
                  {AVATAR_OPTIONS.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(opt)}
                      className={`relative aspect-square rounded-xl overflow-hidden hover:scale-105 transition-all outline-none ${
                        avatarUrl === opt ? 'ring-2 ring-orange-500 scale-105' : 'ring-1 ring-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={opt} alt={`Preset ${idx + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-xs font-mono text-neutral-300 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Or paste custom image URL..."
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide uppercase flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-600/10 hover:shadow-orange-500/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all select-none"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Sidebar Info Panel */}
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-neutral-300 mb-4 border-b border-white/5 pb-2">
                Epic Identity
              </h3>

              <div className="space-y-4">
                <div>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-neutral-500">Registered Email</span>
                  <div className="flex items-center gap-2 mt-1 text-sm font-medium text-neutral-300">
                    <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-neutral-500">Security Verification</span>
                  <div className="mt-2">
                    {getKycBadge((user as any).kyc_status)}
                  </div>
                  {((user as any).kyc_status !== 'verified') && (
                    <p className="text-[10px] text-neutral-500 mt-2 leading-relaxed">
                      KYC verification protects your account and unlocks real-money prize withdrawals.
                    </p>
                  )}
                </div>

                <div>
                  <span className="block text-[8px] font-black uppercase tracking-widest text-neutral-500">Account ID</span>
                  <span className="block text-[10px] font-mono text-neutral-500 bg-neutral-950 p-2 rounded-xl mt-1.5 border border-white/5 select-all overflow-x-auto truncate">
                    {user.id}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
