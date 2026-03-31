import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getDashboardStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Check active participation
    const { data: participation, error: participationError } = await supabase.rpc('check_user_active_participation', { p_user_id: userId });
    
    if (participationError) throw new Error('Failed to check active participation');

    let details = null;
    if (participation.active) {
      if (participation.type === 'request') {
        const { data } = await supabase
          .from('game_requests')
          .select('*, game_type:game_types(name), room:room_categories(name)')
          .eq('id', participation.id)
          .single();
        details = data;
      } else if (participation.type === 'match') {
        const { data } = await supabase
          .from('matches')
          .select('*, game_type:game_types(name), room:room_categories(name)')
          .eq('id', participation.id)
          .single();
        details = data;
      }
    }

    res.json({
      active: participation.active,
      type: participation.type,
      id: participation.id,
      details
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
