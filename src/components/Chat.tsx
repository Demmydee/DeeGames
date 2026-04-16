import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { chatApi } from '../services/multiplayerApi';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  content: string;
  sender_user_id: string;
  message_type: 'text' | 'system';
  created_at: string;
  users?: { username: string };
}

interface ChatProps {
  contextType: 'room' | 'match';
  contextId: string;
  title?: string;
  className?: string;
}

import ErrorMessage from './ui/ErrorMessage';

const Chat: React.FC<ChatProps> = ({ contextType, contextId, title, className = "" }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const data = contextType === 'room' 
        ? await chatApi.getRoomMessages(contextId)
        : await chatApi.getMatchMessages(contextId);
      setMessages(data);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Polling for now
    return () => clearInterval(interval);
  }, [contextType, contextId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const sent = contextType === 'room'
        ? await chatApi.sendRoomMessage(contextId, newMessage)
        : await chatApi.sendMatchMessage(contextId, newMessage);
      
      setMessages(prev => [...prev, sent]);
      setNewMessage("");
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col bg-black/20 border border-white/10 rounded-2xl overflow-hidden ${className}`}>
      {title && (
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{title}</h3>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Live</span>
          </div>
        </div>
      )}

      <ErrorMessage message={error} className="m-2" />

      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[300px] max-h-[500px]"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <Send className="w-5 h-5" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender_user_id === user?.id ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-tight">
                  {msg.users?.username}
                </span>
                <span className="text-[8px] text-white/30 font-mono">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${
                msg.sender_user_id === user?.id 
                  ? 'bg-emerald-600 text-white rounded-tr-none shadow-lg shadow-emerald-900/20' 
                  : 'bg-white/10 text-gray-200 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-black/40 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:text-emerald-400 disabled:opacity-30 disabled:grayscale transition-all"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
