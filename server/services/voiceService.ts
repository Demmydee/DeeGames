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
    // Sanitize matchId to ensure it's a valid room name (alphanumeric, hyphens, underscores)
    const sanitizedId = matchId.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const roomName = `match-${sanitizedId}`;

    let roomData;
    try {
      const response = await axios.post(
        `${DAILY_API_URL}/rooms`,
        {
          name: roomName,
          privacy: 'private',
          properties: {
            enable_chat: false,
            enable_screenshare: false,
            start_audio_off: false,
            start_video_off: true,
          }
        },
        {
          headers: {
            Authorization: `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      roomData = response.data;
    } catch (roomError: any) {
      // If Daily.co says it already exists, that's fine, we just need to get the URL
      if (roomError.response?.status === 400 && roomError.response?.data?.info?.includes('already exists')) {
        const getResponse = await axios.get(`${DAILY_API_URL}/rooms/${roomName}`, {
          headers: { Authorization: `Bearer ${DAILY_API_KEY}` }
        });
        roomData = getResponse.data;
      } else {
        throw roomError;
      }
    }

    const { name, url } = roomData;

    const { data: created, error: createError } = await supabase
      .from('match_voice_rooms')
      .upsert([{
        match_id: matchId,
        daily_room_name: name,
        daily_room_url: url,
        status: 'active',
        updated_at: new Date().toISOString()
      }], { onConflict: 'match_id' })
      .select()
      .single();

    if (createError) {
      console.error('Supabase Voice Room Error:', createError);
      throw new Error('Failed to save voice room to database');
    }
    return created;
  } catch (error: any) {
    const errorData = error.response?.data;
    console.error('Daily.co Room Creation Error Detail:', {
      status: error.response?.status,
      data: errorData,
      message: error.message
    });
    throw new Error(`Daily.co ERROR: ${errorData?.info || errorData?.error || error.message}`);
  }
};

export const getMatchVoiceRoom = async (matchId: string, userId: string) => {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(matchId)) {
    throw new Error('Invalid match ID format');
  }

  // 1. Verify user is a participant in the match
  const { data: participant, error: pError } = await supabase
    .from('match_participants')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .maybeSingle();

  if (pError) {
    console.error('Supabase Participant Error:', pError);
    throw new Error('Failed to verify match participation');
  }

  if (!participant) {
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
    const errorData = error.response?.data;
    console.error('Daily.co Token Generation Error Detail:', {
      status: error.response?.status,
      data: errorData,
      message: error.message
    });
    throw new Error(`Failed to generate Daily.co meeting token: ${errorData?.info || errorData?.error || error.message}`);
  }
};
