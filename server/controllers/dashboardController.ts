import { Request, Response } from 'express';
import { supabase, createClientWithToken } from '../config/supabase';

export const getDashboardStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const token = (req as any).token;

    // Use the service role client if available to bypass RLS
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client = hasServiceKey ? supabase : (token ? createClientWithToken(token) : supabase);

    const { data: participation, error: participationError } = await client.rpc('check_user_active_participation', { p_user_id: userId });

    if (participationError) {
      console.error('Participation RPC Error (Dashboard Status):', JSON.stringify(participationError, null, 2));
      return res.status(500).json({ error: 'Failed to check active participation' });
    }

    if (!participation) {
      return res.json({ active: false, type: null, id: null, details: null });
    }

    let details = null;
    if (participation.active && participation.id) {
      try {
        if (participation.type === 'request') {
          const { data, error } = await client
            .from('game_requests')
            .select('*, game_type:game_types(name), room:room_categories(name)')
            .eq('id', participation.id)
            .single();
          if (error) {
            console.error('Fetch Request Details Error:', error);
          } else {
            details = data;
          }
        } else if (participation.type === 'match') {
          const { data, error } = await client
            .from('matches')
            .select('*, game_type:game_types(name), room:room_categories(name)')
            .eq('id', participation.id)
            .single();
          if (error) {
            console.error('Fetch Match Details Error:', error);
          } else {
            details = data;
          }
        }
      } catch (detailError) {
        console.error('Unexpected error fetching participation details:', detailError);
      }
    }

    res.json({
      active: !!participation.active,
      type: participation.type || null,
      id: participation.id || null,
      details
    });
  } catch (error: any) {
    console.error('Dashboard Status Fatal Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
