import { Request, Response } from 'express';
import * as notificationService from '../services/notificationService';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const notifications = await notificationService.getNotifications(userId);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const result = await notificationService.markAsRead(userId, id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await notificationService.markAllAsRead(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
