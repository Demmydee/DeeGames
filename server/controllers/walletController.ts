import { Response } from 'express';
import * as walletService from '../services/walletService';

export const getWallet = async (req: any, res: Response) => {
  try {
    const wallet = await walletService.getWalletByUserId(req.user.id);
    res.status(200).json({ wallet });
  } catch (error: any) {
    console.error('Get Wallet Controller Error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getTransactions = async (req: any, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const transactions = await walletService.getTransactions(
      req.user.id,
      limit ? parseInt(limit as string) : 20,
      offset ? parseInt(offset as string) : 0
    );
    res.status(200).json({ transactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getRecentTransactions = async (req: any, res: Response) => {
  try {
    const transactions = await walletService.getRecentTransactions(req.user.id);
    res.status(200).json({ transactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
