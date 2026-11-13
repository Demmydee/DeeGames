import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Bot, Sparkles, ShieldCheck, Check, X } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const DEMO_CREDENTIALS = {
  identifier: 'demo_player',
  password: 'DemoPass123!',
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post('/api/auth/login', formData);
      login(response.data.session, response.data.user);
      navigate(response.data.user?.is_guest ? '/lobby' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAccount = () => {
    setError(null);
    setFormData({
      identifier: DEMO_CREDENTIALS.identifier,
      password: DEMO_CREDENTIALS.password,
    });
  };

  const handleInstantGuestLogin = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      const response = await apiClient.post('/api/auth/guest');
      login(response.data.session, response.data.user);
      navigate('/lobby');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start guest demo session.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black uppercase italic mb-2">Welcome Back</h2>
          <p className="text-neutral-400">Sign in to your DeeGames account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              name="identifier"
              placeholder="Username or Email"
              required
              value={formData.identifier}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-4 pl-12 pr-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-4 pl-12 pr-12 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-end">
            <Link to="/support" className="text-sm text-orange-500 hover:underline">Need help signing in?</Link>
          </div>

          <button
            type="submit"
            disabled={loading || guestLoading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all mt-2 whitespace-nowrap"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Guest / Instant Demo Access */}
        <div className="mt-6 pt-6 border-t border-neutral-800 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-400">
              <Bot className="w-4 h-4 shrink-0" />
              <span>Instant Guest Demo</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemoAccount}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 underline whitespace-nowrap shrink-0"
            >
              Fill Test Account
            </button>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-400">
              <span>Test Username:</span>
              <code className="font-mono text-white bg-neutral-900 px-2 py-0.5 rounded">{DEMO_CREDENTIALS.identifier}</code>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Test Password:</span>
              <code className="font-mono text-white bg-neutral-900 px-2 py-0.5 rounded">{DEMO_CREDENTIALS.password}</code>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstantGuestLogin}
            disabled={loading || guestLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{guestLoading ? 'Starting Demo...' : 'Instant Guest Demo Login'}</span>
          </button>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5 space-y-1.5 text-[11px] text-neutral-400">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Play Whot, Ludo &amp; Dice instantly vs AI Bot (free)</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-500">
              <X className="w-3.5 h-3.5 shrink-0 text-neutral-600" />
              <span>Limited: No real-money wagers, wallet, cliques, or live PvP</span>
            </div>
          </div>
        </div>

        <p className="text-center mt-6 text-neutral-500 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-orange-500 font-bold hover:underline inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Register Full Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
