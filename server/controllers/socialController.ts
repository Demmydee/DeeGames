import { Request, Response } from 'express';
import { supabase, createClientWithToken } from '../config/supabase';

export const getRecentOpponents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const token = (req as any).token;

    const client = token ? createClientWithToken(token) : supabase;

    // Debug log for environment status
    console.log('Recent Opponents Request:', {
      userId,
      hasToken: !!token,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // 1. Get all matches the user participated in
    const { data: myMatches, error: matchError } = await client
      .from('match_participants')
      .select('match_id')
      .eq('user_id', userId);

    if (matchError) {
      console.error('Fetch Match History Error:', matchError);
      return res.status(500).json({ error: `Match history error: ${matchError.message}` });
    }

    if (!myMatches || myMatches.length === 0) {
      return res.json([]);
    }

    const matchIds = myMatches.map(m => m.match_id).filter(id => !!id);

    if (matchIds.length === 0) {
      return res.json([]);
    }

    // 2. Get all other participants in those matches
    const { data: participants, error: participantError } = await client
      .from('match_participants')
      .select('user_id, joined_at')
      .in('match_id', matchIds)
      .neq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (participantError) {
      console.error('Fetch Participants Error:', participantError);
      return res.status(500).json({ error: `Participants error: ${participantError.message}` });
    }

    if (!participants || participants.length === 0) {
      return res.json([]);
    }

    // Deduplicate and get unique user IDs
    const uniqueUserIds = Array.from(new Set(participants.map(p => p.user_id)));

    // 3. Get user profiles for these IDs
    const { data: userProfiles, error: userError } = await client
      .from('users')
      .select('id, username, last_login_at')
      .in('id', uniqueUserIds);

    if (userError) {
      console.error('Fetch User Profiles Error:', userError);
      return res.status(500).json({ error: `User profiles error: ${userError.message}` });
    }

    // 4. Map profiles back to participants
    const profileMap = new Map(userProfiles?.map(p => [p.id, p]) || []);
    const uniqueOpponents = new Map();

    participants.forEach(p => {
      if (!uniqueOpponents.has(p.user_id)) {
        const profile = profileMap.get(p.user_id);
        if (profile) {
          uniqueOpponents.set(p.user_id, {
            id: p.user_id,
            username: profile.username,
            last_seen_at: profile.last_login_at,
            last_match_at: p.joined_at
          });
        }
      }
    });

    res.json(Array.from(uniqueOpponents.values()));
  } catch (error: any) {
    console.error('Recent Opponents Fatal Error:', error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const token = (req as any).token;
    if (!query) return res.json([]);

    const client = token ? createClientWithToken(token) : supabase;

    const { data: users, error } = await client
      .from('users')
      .select('id, username, created_at')
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) {
      console.error('Search Users Error:', error);
      return res.status(500).json({ error: `Search error: ${error.message}` });
    }

    res.json(users);
  } catch (error: any) {
    console.error('Search Users Fatal Error:', error);
    res.status(500).json({ error: `Server error: ${error.message}` });
  }
};
