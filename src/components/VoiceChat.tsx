import React, { useEffect, useState, useRef, useCallback } from 'react';
import DailyIframe, { DailyCall, DailyEventObjectTrack } from '@daily-co/daily-js';
import { Mic, MicOff, Loader2, Volume2, VolumeX, Shield, AlertCircle } from 'lucide-react';
import { voiceApi } from '../services/multiplayerApi';

interface VoiceChatProps {
  matchId: string;
  className?: string;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ matchId, className = "" }) => {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [status, setStatus] = useState<'initializing' | 'joining' | 'joined' | 'error'>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<number>(0);
  const callRef = useRef<DailyCall | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const speakerMutedRef = useRef(isSpeakerMuted);

  // Keep ref in sync with state
  useEffect(() => {
    speakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);

  const handleTrackStarted = useCallback((event?: DailyEventObjectTrack) => {
    if (!event || event.track.kind !== 'audio' || event.participant.local) return;

    // Create audio element for the participant
    const audioEl = document.createElement('audio');
    audioEl.srcObject = new MediaStream([event.track]);
    audioEl.autoplay = true;
    audioEl.dataset.participantId = event.participant.session_id;
    audioEl.muted = speakerMutedRef.current;

    if (audioContainerRef.current) {
      audioContainerRef.current.appendChild(audioEl);
    }
  }, []);

  const handleTrackStopped = useCallback((event?: DailyEventObjectTrack) => {
    if (!event || event.track.kind !== 'audio') return;
    const audioEl = audioContainerRef.current?.querySelector(`audio[data-participant-id="${event.participant.session_id}"]`);
    if (audioEl) {
      audioEl.remove();
    }
  }, []);

  const initCall = useCallback(async () => {
    try {
      // Check if a call instance already exists
      const existingCo = DailyIframe.getCallInstance();
      if (existingCo) {
        try {
          await existingCo.leave();
          await existingCo.destroy();
        } catch (e) {
          console.warn('Error cleaning up existing call:', e);
        }
      }

      // Small delay to ensure Daily has cleaned up internal state
      await new Promise(resolve => setTimeout(resolve, 100));

      setStatus('initializing');
      const session = await voiceApi.getMatchSession(matchId);

      // Re-check after async call to prevent race conditions
      if (DailyIframe.getCallInstance()) {
        await DailyIframe.getCallInstance()?.destroy();
      }

      const co = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
      });

      callRef.current = co;
      setCallObject(co);
      setStatus('joining');

      // Event listeners
      co.on('participant-joined', () => setParticipants(Object.keys(co.participants() || {}).length));
      co.on('participant-left', () => setParticipants(Object.keys(co.participants() || {}).length));
      co.on('track-started', handleTrackStarted);
      co.on('track-stopped', handleTrackStopped);
      co.on('error', (e) => {
        console.error('Daily Error:', e);
        setError('Voice connection failed');
        setStatus('error');
      });

      await co.join({
        url: session.daily_room_url,
        token: session.token,
      });

      setStatus('joined');
      setParticipants(Object.keys(co.participants() || {}).length);

    } catch (err: any) {
      console.error('Failed to init voice chat:', err);
      setError(err.message || 'Failed to connect to voice');
      setStatus('error');
    }
  }, [matchId, handleTrackStarted, handleTrackStopped]);

  useEffect(() => {
    initCall();
    return () => {
      const co = callRef.current || DailyIframe.getCallInstance();
      if (co) {
        co.leave().then(() => co.destroy());
      }
    };
  }, [initCall]);

  useEffect(() => {
    // Update all audio elements when speaker mute state changes
    if (audioContainerRef.current) {
      const audios = audioContainerRef.current.querySelectorAll('audio');
      audios.forEach(audio => {
        audio.muted = isSpeakerMuted;
      });
    }
  }, [isSpeakerMuted]);

  const toggleMute = () => {
    if (!callObject) return;
    const newMuteState = !isMuted;
    callObject.setLocalAudio(!newMuteState);
    setIsMuted(newMuteState);
  };

  const toggleSpeakerMute = () => {
    setIsSpeakerMuted(!isSpeakerMuted);
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
      {/* Hidden container for audio elements */}
      <div ref={audioContainerRef} className="hidden" />

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
          onClick={toggleSpeakerMute}
          disabled={status !== 'joined'}
          className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
            isSpeakerMuted
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-500 hover:bg-blue-500/20'
          } disabled:opacity-30 disabled:grayscale`}
          title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
        >
          {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleMute}
          disabled={status !== 'joined'}
          className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
            isMuted
              ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
          } disabled:opacity-30 disabled:grayscale`}
          title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
            {isMuted ? 'Muted' : 'Unmuted'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default VoiceChat;
