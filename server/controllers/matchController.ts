import { Request, Response } from 'express';
import * as matchService from '../services/matchService';

export const getMatchById = async (req: Request, res: Response) => {
  try {
    const match = await matchService.getMatchById(req.params.id);
    res.json(match);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const leaveMatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await matchService.leaveMatch(userId, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getUserActiveMatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const match = await matchService.getUserActiveMatch(userId);
    res.json(match);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
