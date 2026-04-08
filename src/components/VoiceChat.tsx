import React, { useEffect, useState, useRef, useCallback } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { Mic, MicOff, Loader2, Volume2, Shield, AlertCircle } from 'lucide-react';
import { voiceApi } from '../services/multiplayerApi';

interface VoiceChatProps {
  matchId: string;
  className?: string;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ matchId, className = "" }) => {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'initializing' | 'joining' | 'joined' | 'error'>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number>(0);

  const initCall = useCallback(async () => {
    try {
      setStatus('initializing');
      const session = await voiceApi.getMatchSession(matchId);
      
      const co = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
      });

      setCallObject(co);
      setStatus('joining');

      await co.join({
        url: session.daily_room_url,
        token: session.token,
      });

      setStatus('joined');
      setParticipants(Object.keys(co.participants()).length);

      // Event listeners
      co.on('participant-joined', () => setParticipants(Object.keys(co.participants()).length));
      co.on('participant-left', () => setParticipants(Object.keys(co.participants()).length));
      co.on('error', (e) => {
        console.error('Daily Error:', e);
        setError('Voice connection failed');
        setStatus('error');
      });

    } catch (err: any) {
      console.error('Failed to init voice chat:', err);
      setError(err.message || 'Failed to connect to voice');
      setStatus('error');
    }
  }, [matchId]);

  useEffect(() => {
    initCall();
    return () => {
      if (callObject) {
        callObject.leave();
        callObject.destroy();
      }
    };
  }, [initCall]);

  const toggleMute = () => {
    if (!callObject) return;
    const newMuteState = !isMuted;
    callObject.setLocalAudio(!newMuteState);
    setIsMuted(newMuteState);
  };

  if (status === 'error') {
    return (
      <div className={`p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-500" />
        <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-black/20 border border-white/10 rounded-2xl flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          status === 'joined' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-gray-500'
        }`}>
          {status === 'joined' ? <Volume2 className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
        </div>
        <div>
          <div className="text-[10px] font-black uppercase italic tracking-tight text-white/60">
            Match Voice Room
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'joined' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'}`} />
            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
              {status === 'joined' ? `${participants} Active` : status}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          disabled={status !== 'joined'}
          className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
            isMuted 
              ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
          } disabled:opacity-30 disabled:grayscale`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isMuted ? 'Muted' : 'Unmuted'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default VoiceChat;
