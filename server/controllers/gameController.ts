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
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('match_id', matchId)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};
