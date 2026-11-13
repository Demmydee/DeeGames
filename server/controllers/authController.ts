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

export const guestLogin = async (_req: Request, res: Response) => {
  try {
    const result = authService.createGuestSession();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to start guest demo' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    if (req.user?.is_guest) {
      return res.status(200).json({
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          is_guest: true,
          full_name: 'Guest Demo Player',
          avatar_url: '',
          kyc_status: 'guest'
        }
      });
    }
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({ user });
  } catch (error: any) {
    res.status(error.status || 404).json({ error: error.message });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const updatedUser = await authService.updateUserProfile(req.user.id, req.body);
    res.status(200).json({ user: updatedUser });
  } catch (error: any) {
    res.status(error.status || 400).json({ error: error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw { status: 400, message: 'Refresh token required' };
    const result = await authService.refreshToken(refreshToken);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(error.status || 401).json({ error: error.message });
  }
};
