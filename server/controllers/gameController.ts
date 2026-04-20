import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { GameStateService } from '../services/gameStateService';
import { HeartbeatService } from '../services/heartbeatService';

export const getGameState = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const state = await GameStateService.getGameState(matchId);
    res.json(state);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const processMove = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = (req as any).user.id;
    const moveData = req.body;
    const result = await GameStateService.processMove(matchId, userId, moveData);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const recordHeartbeat = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = (req as any).user.id;
    const result = await HeartbeatService.recordHeartbeat(matchId, userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const leaveMatch = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = (req as any).user.id;
    const result = await GameStateService.handlePlayerDefeat(matchId, userId, 'left');
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMatchResult = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const { data: result, error } = await supabase
      .from('match_results')
      .select(`
        *,
        payouts:match_payouts(*)
      `)
      .eq('match_id', matchId)
      .single();
    
    if (error) throw error;

    // Merge payout data into rankings for easier frontend consumption
    if (result && result.rankings) {
      result.rankings = result.rankings.map((r: any) => {
        const payout = result.payouts?.find((p: any) => p.user_id === r.userId);
        return {
          ...r,
          payoutKobo: payout?.payout_kobo || 0,
          wagerKobo: payout?.wager_kobo || 0,
          isWinner: payout?.is_winner || false
        };
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};
