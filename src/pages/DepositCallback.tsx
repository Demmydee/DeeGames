import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Wallet } from 'lucide-react';
import apiClient from '../api/client';

const DepositCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (status === 'success' || status === 'failed') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // On success, go to wallet. On failure, go back to deposit page to try again.
            navigate(status === 'success' ? '/wallet' : '/deposit');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, navigate]);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference') || searchParams.get('trxref');
      const errorParam = searchParams.get('error');
      
      if (errorParam) {
        setStatus('failed');
        setMessage(decodeURIComponent(errorParam));
        return;
      }

      if (!reference) {
        setStatus('failed');
        setMessage('No transaction reference found.');
        return;
      }

      try {
        const response = await apiClient.post('/api/wallet/deposit/verify', { reference });
        if (response.data.status === 'successful') {
          setStatus('success');
          setMessage('Your deposit was successful! Your wallet has been credited.');
        } else {
          setStatus('failed');
          setMessage(response.data.message || 'Payment verification failed.');
        }
      } catch (error: any) {
        console.error('Verification Error:', error);
        setStatus('failed');
        setMessage(error.response?.data?.error || 'An error occurred during verification.');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-10 rounded-3xl shadow-2xl text-center"
      >
        {status === 'loading' && (
          <div className="space-y-6">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto" />
            <h2 className="text-2xl font-black uppercase italic">Verifying Payment</h2>
            <p className="text-neutral-400">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-black uppercase italic">Payment Successful!</h2>
            <p className="text-neutral-400">{message}</p>
            <p className="text-sm text-neutral-500">Redirecting in {countdown}s...</p>
            <div className="pt-6 space-y-3">
              <Link
                to="/wallet"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Go to Wallet <Wallet className="w-5 h-5" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Back to Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-black uppercase italic">Payment Failed</h2>
            <p className="text-neutral-400">{message}</p>
            <p className="text-sm text-neutral-500">Redirecting back in {countdown}s...</p>
            <div className="pt-6 space-y-3">
              <Link
                to="/deposit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Try Again <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/wallet"
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Back to Wallet <Wallet className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DepositCallback;
