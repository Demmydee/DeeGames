import { Request, Response } from 'express';
import { supabase, createClientWithToken } from '../config/supabase';

export const getRecentOpponents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const token = (req as any).token;

    // Use a client with the user's token if we're not sure about the service role
    // This ensures RLS is respected if the service role key is missing
    const client = token ? createClientWithToken(token) : supabase;

    // 1. Get all matches the user participated in
    const { data: myMatches, error: matchError } = await client
      .from('match_participants')
      .select('match_id')
      .eq('user_id', userId);

    if (matchError) {
      console.error('Fetch Match History Error:', matchError);
      return res.status(500).json({ error: 'Failed to fetch match history' });
    }

    if (!myMatches || myMatches.length === 0) {
      return res.json([]);
    }

    const matchIds = myMatches.map(m => m.match_id).filter(id => !!id);

    if (matchIds.length === 0) {
      return res.json([]);
    }

    // 2. Get all other participants in those matches
    const { data: opponents, error: opponentError } = await client
      .from('match_participants')
      .select('user_id, joined_at, users(username, last_login_at)')
      .in('match_id', matchIds)
      .neq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (opponentError) {
      console.error('Fetch Opponents Error:', opponentError);
      return res.status(500).json({ error: 'Failed to fetch opponents' });
    }

    if (!opponents) {
      return res.json([]);
    }

    // 3. Deduplicate by user_id and keep the latest encounter
    const uniqueOpponents = new Map();
    opponents.forEach(o => {
      if (!uniqueOpponents.has(o.user_id)) {
        let userData = o.users as any;
        if (Array.isArray(userData)) {
          userData = userData[0];
        }

        if (userData && userData.username) {
          uniqueOpponents.set(o.user_id, {
            id: o.user_id,
            username: userData.username,
            last_seen_at: userData.last_login_at,
            last_match_at: o.joined_at
          });
        }
      }
    });

    res.json(Array.from(uniqueOpponents.values()));
  } catch (error: any) {
    console.error('Recent Opponents Fatal Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, created_at')
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) throw new Error('Failed to search users');

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
