import { Request, Response } from 'express';
import * as presenceService from '../services/presenceService';

export const ping = async (req: Request, res: Response) => {
  try {
    if ((req as any).user?.is_guest) {
      return res.json({ success: true, is_guest: true });
    }
    const userId = (req as any).user.id;
    await presenceService.updateLastSeen(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
