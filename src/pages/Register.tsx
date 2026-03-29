import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, Phone, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    isAdultConfirmed: false,
    termsAccepted: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords don't match" });
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/api/auth/register', formData);
      login(response.data.session, response.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.details) {
        const newFieldErrors: Record<string, string> = {};
        errorData.details.forEach((d: any) => {
          const path = d.path[d.path.length - 1];
          newFieldErrors[path] = d.message;
        });
        setFieldErrors(newFieldErrors);
        setError(errorData.error || 'Validation failed');
      } else {
        setError(errorData?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black uppercase italic mb-2">Create Account</h2>
          <p className="text-neutral-400">Join the elite P2P gaming community</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              name="username"
              placeholder="Username"
              required
              value={formData.username}
              onChange={handleChange}
              className={`w-full bg-neutral-950 border ${fieldErrors.username ? 'border-red-500' : 'border-neutral-800'} rounded-xl py-3 pl-12 pr-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all`}
            />
            {fieldErrors.username && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.username}</p>}
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-neutral-950 border ${fieldErrors.email ? 'border-red-500' : 'border-neutral-800'} rounded-xl py-3 pl-12 pr-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all`}
            />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.email}</p>}
          </div>

          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              required
              value={formData.phone}
              onChange={handleChange}
              className={`w-full bg-neutral-950 border ${fieldErrors.phone ? 'border-red-500' : 'border-neutral-800'} rounded-xl py-3 pl-12 pr-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all`}
            />
            {fieldErrors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.phone}</p>}
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
              className={`w-full bg-neutral-950 border ${fieldErrors.password ? 'border-red-500' : 'border-neutral-800'} rounded-xl py-3 pl-12 pr-12 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.password}</p>}
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full bg-neutral-950 border ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-neutral-800'} rounded-xl py-3 pl-12 pr-12 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.confirmPassword}</p>}
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="isAdultConfirmed"
                required
                checked={formData.isAdultConfirmed}
                onChange={handleChange}
                className="mt-1 w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">
                I confirm that I am at least 18 years old.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                name="termsAccepted"
                required
                checked={formData.termsAccepted}
                onChange={handleChange}
                className="mt-1 w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">
                I accept the <a href="#" className="text-orange-500 hover:underline">Terms and Conditions</a> and <a href="#" className="text-orange-500 hover:underline">Privacy Policy</a>.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all mt-4"
          >
            {loading ? 'Creating Account...' : 'Register Now'}
          </button>
        </form>

        <p className="text-center mt-6 text-neutral-500 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-500 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
