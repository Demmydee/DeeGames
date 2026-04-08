import { Request, Response } from 'express';
import * as supportService from '../services/supportService';

export const submitSupportTicket = async (req: Request, res: Response) => {
  try {
    const { subject, message } = req.body;
    const userId = (req as any).user?.id || null;
    const ticket = await supportService.submitSupportTicket(userId, subject, message);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const tickets = await supportService.getMyTickets(userId);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
