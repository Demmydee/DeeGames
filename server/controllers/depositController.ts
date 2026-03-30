import { Request, Response } from 'express';
import * as depositService from '../services/depositService';

export const initiateDeposit = async (req: any, res: Response) => {
  try {
    const { amount } = req.body;
    const result = await depositService.initiateDeposit(req.user.id, req.user.email, amount);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const verifyDeposit = async (req: any, res: Response) => {
  try {
    const { reference } = req.body;
    const result = await depositService.verifyDeposit(reference);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { trxref, reference } = req.query;
    const ref = (reference || trxref) as string;
    
    if (!ref) {
      return res.status(400).json({ error: 'No reference provided' });
    }

    const result = await depositService.verifyDeposit(ref);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const result = await depositService.handleWebhook(signature, req.body);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    // Paystack expects 200 even if processing fails internally to stop retries
    res.status(200).json({ error: error.message });
  }
};

export const getDeposits = async (req: any, res: Response) => {
  try {
    const deposits = await depositService.getUserDeposits(req.user.id);
    res.status(200).json({ deposits });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
