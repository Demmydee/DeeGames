import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getDashboardStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Check active participation
    const { data: participation, error: participationError } = await supabase.rpc('check_user_active_participation', { p_user_id: userId });
    
    if (participationError) {
      console.error('Participation RPC Error:', participationError);
      throw new Error('Failed to check active participation');
    }

    if (!participation) {
      return res.json({ active: false, type: null, id: null, details: null });
    }

    let details = null;
    if (participation.active && participation.id) {
      try {
        if (participation.type === 'request') {
          const { data, error } = await supabase
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
          const { data, error } = await supabase
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
      active: participation.active,
      type: participation.type,
      id: participation.id,
      details
    });
  } catch (error: any) {
    console.error('Dashboard Status Error:', error);
    res.status(500).json({ error: error.message });
  }
};
