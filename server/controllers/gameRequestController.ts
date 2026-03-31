import { Request, Response } from 'express';
import * as gameRequestService from '../services/gameRequestService';

export const createGameRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const request = await gameRequestService.createGameRequest(userId, req.body);
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const joinGameRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await gameRequestService.joinGameRequest(userId, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const cancelGameRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await gameRequestService.cancelGameRequest(userId, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const leaveGameRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await gameRequestService.leaveGameRequest(userId, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const startGameRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await gameRequestService.startGameRequest(userId, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getGameRequestById = async (req: Request, res: Response) => {
  try {
    const request = await gameRequestService.getGameRequestById(req.params.id);
    res.json(request);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};
