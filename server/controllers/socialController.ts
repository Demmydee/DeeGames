import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getRecentOpponents = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // 1. Get all matches the user participated in
    const { data: myMatches, error: matchError } = await supabase
      .from('match_participants')
      .select('match_id')
      .eq('user_id', userId);

    if (matchError) {
      console.error('Fetch Match History Error:', matchError);
      throw new Error('Failed to fetch match history');
    }

    if (!myMatches || myMatches.length === 0) {
      console.log('No match history found for user', userId);
      return res.json([]);
    }

    const matchIds = myMatches.map(m => m.match_id).filter(id => !!id);

    if (matchIds.length === 0) {
      return res.json([]);
    }

    // 2. Get all other participants in those matches
    const { data: opponents, error: opponentError } = await supabase
      .from('match_participants')
      .select('user_id, joined_at, users(username, last_login_at)')
      .in('match_id', matchIds)
      .neq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (opponentError) {
      console.error('Fetch Opponents Error:', opponentError);
      throw new Error('Failed to fetch opponents');
    }

    if (!opponents) {
      console.log('No opponents found for user', userId);
      return res.json([]);
    }

    // 3. Deduplicate by user_id and keep the latest encounter
    const uniqueOpponents = new Map();
    opponents.forEach(o => {
      if (!uniqueOpponents.has(o.user_id)) {
        const userData = Array.isArray(o.users) ? o.users[0] : o.users;
        if (userData) {
          uniqueOpponents.set(o.user_id, {
            id: o.user_id,
            username: (userData as any).username,
            last_seen_at: (userData as any).last_login_at,
            last_match_at: o.joined_at
          });
        }
      }
    });

    res.json(Array.from(uniqueOpponents.values()));
  } catch (error: any) {
    console.error('Recent Opponents Error:', error);
    res.status(500).json({ error: error.message });
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
