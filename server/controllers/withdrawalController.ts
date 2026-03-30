import { Response } from 'express';
import * as withdrawalService from '../services/withdrawalService';

export const requestWithdrawal = async (req: any, res: Response) => {
  try {
    const { amount, payoutAccountId } = req.body;
    const withdrawal = await withdrawalService.requestWithdrawal(req.user.id, amount, payoutAccountId);
    res.status(201).json({ withdrawal });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getWithdrawals = async (req: any, res: Response) => {
  try {
    const withdrawals = await withdrawalService.getUserWithdrawals(req.user.id);
    res.status(200).json({ withdrawals });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
