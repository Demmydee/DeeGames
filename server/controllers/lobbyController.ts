import { Request, Response } from 'express';
import * as lobbyService from '../services/lobbyService';

export const getRoomCategories = async (req: Request, res: Response) => {
  try {
    const rooms = await lobbyService.getRoomCategories();
    res.json(rooms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomCategoryById = async (req: Request, res: Response) => {
  try {
    const room = await lobbyService.getRoomCategoryById(req.params.id);
    res.json(room);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getRoomOccupancy = async (req: Request, res: Response) => {
  try {
    const occupancy = await lobbyService.getRoomOccupancy(req.params.id);
    res.json({ occupancy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomGames = async (req: Request, res: Response) => {
  try {
    const games = await lobbyService.getRoomGames(req.params.id);
    res.json(games);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGameTypes = async (req: Request, res: Response) => {
  try {
    const games = await lobbyService.getGameTypes();
    res.json(games);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePresence = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const roomId = req.params.id;
    await lobbyService.updateRoomPresence(roomId, userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
