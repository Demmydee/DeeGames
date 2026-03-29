import { Request, Response } from 'express';
import * as authService from '../services/authService';

export const register = async (req: Request, res: Response) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const result = await authService.loginUser(identifier, password);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(error.status || 401).json({ error: error.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({ user });
  } catch (error: any) {
    res.status(error.status || 404).json({ error: error.message });
  }
};
