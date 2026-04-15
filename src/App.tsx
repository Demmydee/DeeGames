import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Deposit from './pages/Deposit';
import DepositCallback from './pages/DepositCallback';
import Withdraw from './pages/Withdraw';
import PayoutAccounts from './pages/PayoutAccounts';
import Transactions from './pages/Transactions';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import GameRoomShell from './pages/GameRoomShell';
import Cliques from './pages/Cliques';
import FAQ from './pages/FAQ';
import Support from './pages/Support';
import Navbar from './components/layout/Navbar';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-black text-orange-500">Loading...</div>;
  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen bg-black text-orange-500">Loading...</div>;
  if (token) return <Navigate to="/dashboard" />;
  return <>{children}</>;
};

export default function App() {
  React.useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'Local Server (Relative)';
    console.log(`%c🚀 DeeGames API: ${apiUrl}`, 'color: #f97316; font-weight: bold; font-size: 12px;');
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
        <Route path="/deposit/callback" element={<ProtectedRoute><DepositCallback /></ProtectedRoute>} />
        <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
        <Route path="/payout-accounts" element={<ProtectedRoute><PayoutAccounts /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
        <Route path="/lobby/room/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
        <Route path="/match/:id" element={<ProtectedRoute><GameRoomShell /></ProtectedRoute>} />
        <Route path="/cliques" element={<ProtectedRoute><Cliques /></ProtectedRoute>} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/support" element={<Support />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}
