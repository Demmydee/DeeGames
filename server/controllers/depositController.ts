import { Request, Response } from 'express';
import * as depositService from '../services/depositService';
import { config } from '../config';

export const initiateDeposit = async (req: any, res: Response) => {
  try {
    const { amount } = req.body;
    const result = await depositService.initiateDeposit(req.user.id, req.user.email, amount, req.token);
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
      return res.redirect(`${config.frontendUrl}/deposit/callback?error=No reference provided`);
    }

    // Verify the deposit to ensure the wallet is credited before the user sees the result
    await depositService.verifyDeposit(ref);
    
    // Redirect to the frontend callback page
    res.redirect(`${config.frontendUrl}/deposit/callback?reference=${ref}`);
  } catch (error: any) {
    console.error('Callback Error:', error.message);
    // Even if verification fails here, redirect to frontend so it can show the error message
    const { trxref, reference } = req.query;
    const ref = (reference || trxref) as string;
    res.redirect(`${config.frontendUrl}/deposit/callback?reference=${ref}&error=${encodeURIComponent(error.message)}`);
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
    const deposits = await depositService.getUserDeposits(req.user.id, req.token);
    res.status(200).json({ deposits });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
