import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import adminClient from '../../api/adminClient';
import { Shield, AlertTriangle, Key } from 'lucide-react';

export default function AdminLogin() {
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Show message if logged out or redirected
  const isExpired = searchParams.get('expired') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await adminClient.post('/api/admin/auth/login', {
        email,
        password
      });

      if (response.data?.token && response.data?.admin) {
        adminLogin(response.data.token, response.data.admin);
        navigate('/admin/dashboard');
      } else {
        setError('Unexpected server response format.');
      }
    } catch (err: any) {
      console.error('Admin authentication failure:', err);
      const errMsg = err.response?.data?.error || 'Failed to authenticate administrative session.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-md p-8 rounded-lg bg-neutral-900 border border-neutral-800 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-orange-500/10 rounded-full text-orange-500 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">DeeGames Admin Console</h2>
          <p className="text-neutral-400 text-sm mt-1">Authorized Administrative Access Only</p>
        </div>

        {isExpired && !error && (
          <div className="mb-6 p-3 rounded bg-orange-500/10 border border-orange-500/20 flex items-center gap-2 text-orange-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Your administrative session has expired. Please log in again.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded focus:outline-none focus:border-orange-500 text-neutral-100 placeholder-neutral-600 transition"
              placeholder="admin@deegames.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-4 pr-10 py-3 bg-neutral-950 border border-neutral-800 rounded focus:outline-none focus:border-orange-500 text-neutral-100 placeholder-neutral-600 transition"
                placeholder="••••••••••••"
              />
              <Key className="absolute right-3 top-3.5 w-4 h-4 text-neutral-600" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-800 disabled:text-neutral-500 rounded font-semibold text-center transition flex justify-center items-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Enter Admin Console'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} DeeGames Platform Security</p>
          <p className="mt-1">All accesses and modifications are logged securely.</p>
        </div>
      </div>
    </div>
  );
}
