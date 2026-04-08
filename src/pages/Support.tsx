import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Check, 
  AlertCircle, 
  Clock, 
  HelpCircle,
  ChevronRight,
  Mail,
  ShieldCheck
} from 'lucide-react';
import { supportApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';

const Support: React.FC = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;
    try {
      const data = await supportApi.getMyTickets();
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await supportApi.submitTicket({ subject, message });
      setSuccess(true);
      setSubject("");
      setMessage("");
      fetchTickets();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Support Center</h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">We're here to help you</p>
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Support Form */}
          <div className="space-y-8">
            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Send className="w-24 h-24" />
              </div>
              
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-6">Submit a Ticket</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-500 text-xs font-bold uppercase tracking-widest"
                  >
                    <Check className="w-5 h-5" />
                    Ticket submitted successfully!
                  </motion.div>
                )}

                {error && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Briefly describe your issue..."
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide as much detail as possible..."
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all min-h-[150px] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send Ticket</>}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <Mail className="w-6 h-6 text-blue-400 mb-3" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Email Support</h3>
                <p className="text-[10px] text-gray-500">support@deegames.com</p>
              </div>
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                <ShieldCheck className="w-6 h-6 text-purple-400 mb-3" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Security Team</h3>
                <p className="text-[10px] text-gray-500">security@deegames.com</p>
              </div>
            </div>
          </div>

          {/* Ticket History */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">My Tickets</h2>
              <button onClick={fetchTickets} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2 opacity-20" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center bg-white/5 border border-white/10 rounded-3xl opacity-40">
                <HelpCircle className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No tickets yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          ticket.status === 'open' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {ticket.status}
                        </span>
                      </div>
                      <span className="text-[8px] text-gray-600 font-mono">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight mb-2 group-hover:text-emerald-500 transition-colors">
                      {ticket.subject}
                    </h3>
                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                      {ticket.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
