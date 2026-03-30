import { Response } from 'express';
import * as payoutAccountService from '../services/payoutAccountService';

export const createPayoutAccount = async (req: any, res: Response) => {
  try {
    const account = await payoutAccountService.createPayoutAccount(req.user.id, req.body);
    res.status(201).json({ account });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getPayoutAccounts = async (req: any, res: Response) => {
  try {
    const accounts = await payoutAccountService.getPayoutAccounts(req.user.id);
    res.status(200).json({ accounts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePayoutAccount = async (req: any, res: Response) => {
  try {
    const account = await payoutAccountService.updatePayoutAccount(req.user.id, req.params.id, req.body);
    res.status(200).json({ account });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePayoutAccount = async (req: any, res: Response) => {
  try {
    await payoutAccountService.deletePayoutAccount(req.user.id, req.params.id);
    res.status(200).json({ message: 'Payout account deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
