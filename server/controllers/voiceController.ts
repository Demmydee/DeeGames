import { Request, Response } from 'express';
import * as voiceService from '../services/voiceService';

export const getMatchVoiceSession = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = (req as any).user.id;
    const session = await voiceService.getMatchVoiceRoom(matchId, userId);
    res.json(session);
  } catch (error: any) {
    res.status(403).json({ error: error.message });
  }
};
