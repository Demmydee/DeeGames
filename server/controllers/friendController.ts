import { Request, Response } from 'express';
import * as friendService from '../services/friendService';

export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    const { addresseeId } = req.body;
    const requesterId = (req as any).user.id;
    const request = await friendService.sendFriendRequest(requesterId, addresseeId);
    res.json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const result = await friendService.acceptFriendRequest(userId, id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const rejectFriendRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const result = await friendService.rejectFriendRequest(userId, id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const removeFriend = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const result = await friendService.removeFriend(userId, id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getFriends = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const friends = await friendService.getFriends(userId);
    res.json(friends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getIncomingRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const requests = await friendService.getIncomingRequests(userId);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getOutgoingRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const requests = await friendService.getOutgoingRequests(userId);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
