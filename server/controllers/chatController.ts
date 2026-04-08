import { Request, Response } from 'express';
import * as chatService from '../services/chatService';

export const getRoomMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = await chatService.getOrCreateChatRoom('room', roomId);
    const messages = await chatService.getChatMessages(room.id);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sendRoomMessage = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;
    const room = await chatService.getOrCreateChatRoom('room', roomId);
    const message = await chatService.sendMessage(room.id, userId, content);
    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMatchMessages = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const room = await chatService.getOrCreateChatRoom('match', matchId);
    const messages = await chatService.getChatMessages(room.id);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const sendMatchMessage = async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;
    const room = await chatService.getOrCreateChatRoom('match', matchId);
    const message = await chatService.sendMessage(room.id, userId, content);
    res.json(message);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
