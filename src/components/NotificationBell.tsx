import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Loader2, AlertCircle, UserPlus, Gamepad2, Wallet, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { notificationApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [notifs, countData] = await Promise.all([
        notificationApi.getNotifications(),
        notificationApi.getUnreadCount()
      ]);
      setNotifications(notifs);
      setUnreadCount(countData.count);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message;
      console.error('Failed to fetch notifications:', errorMessage);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request_received':
      case 'friend_request_accepted':
        return <UserPlus className="w-4 h-4 text-blue-400" />;
      case 'request_joined':
      case 'match_started':
        return <Gamepad2 className="w-4 h-4 text-emerald-400" />;
      case 'deposit_successful':
      case 'withdrawal_status_changed':
        return <Wallet className="w-4 h-4 text-amber-400" />;
      case 'report_submitted':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all relative group"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-black group-hover:scale-110 transition-transform">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/60 whitespace-nowrap">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center opacity-40">
                    <Bell className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-white/5 last:border-0 transition-colors relative group ${
                        !notif.is_read ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          !notif.is_read ? 'bg-emerald-500/10' : 'bg-white/5'
                        }`}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-tight truncate">
                              {notif.title}
                            </h4>
                            <span className="text-[8px] text-gray-500 font-mono shrink-0">
                              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="p-1 rounded-md hover:bg-emerald-500/20 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
