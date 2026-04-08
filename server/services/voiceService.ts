import axios from 'axios';
import { supabase } from '../config/supabase';

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

export const createDailyRoom = async (matchId: string) => {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  // Check if room already exists for this match
  const { data: existing, error: findError } = await supabase
    .from('match_voice_rooms')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  if (findError) throw new Error('Failed to find voice room');
  if (existing) return existing;

  try {
    const response = await axios.post(
      `${DAILY_API_URL}/rooms`,
      {
        name: `match-${matchId}`,
        privacy: 'private',
        properties: {
          enable_chat: false,
          enable_screenshare: false,
          start_audio_off: false,
          start_video_off: true, // Voice only by default
        }
      },
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { name, url } = response.data;

    const { data: created, error: createError } = await supabase
      .from('match_voice_rooms')
      .insert([{
        match_id: matchId,
        daily_room_name: name,
        daily_room_url: url,
        status: 'active'
      }])
      .select()
      .single();

    if (createError) throw new Error('Failed to save voice room to database');
    return created;
  } catch (error: any) {
    console.error('Daily.co API Error:', error.response?.data || error.message);
    throw new Error('Failed to create Daily.co room');
  }
};

export const getMatchVoiceRoom = async (matchId: string, userId: string) => {
  // 1. Verify user is a participant in the match
  const { data: participant, error: pError } = await supabase
    .from('match_participants')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .maybeSingle();

  if (pError || !participant) {
    throw new Error('Unauthorized: You are not a participant in this match');
  }

  // 2. Get or create the voice room
  const voiceRoom = await createDailyRoom(matchId);

  // 3. Generate a meeting token for the participant
  const token = await generateMeetingToken(voiceRoom.daily_room_name, userId);

  return {
    ...voiceRoom,
    token
  };
};

const generateMeetingToken = async (roomName: string, userId: string) => {
  if (!DAILY_API_KEY) {
    throw new Error('DAILY_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `${DAILY_API_URL}/meeting-tokens`,
      {
        properties: {
          room_name: roomName,
          user_id: userId,
          is_owner: false,
          enable_screenshare: false,
        }
      },
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.token;
  } catch (error: any) {
    console.error('Daily.co Token Error:', error.response?.data || error.message);
    throw new Error('Failed to generate Daily.co meeting token');
  }
};
