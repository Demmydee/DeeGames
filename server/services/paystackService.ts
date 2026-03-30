import axios from 'axios';
import { config } from '../config';

const PAYSTACK_SECRET_KEY = config.paystack.secretKey;
const PAYSTACK_BASE_URL = config.paystack.baseUrl;

const paystackApi = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const initializeTransaction = async (email: string, amount: number, reference: string, metadata: any) => {
  try {
    const response = await paystackApi.post('/transaction/initialize', {
      email,
      amount: Math.round(amount * 100), // Convert to kobo
      currency: 'NGN',
      reference,
      callback_url: config.paystack.callbackUrl,
      metadata,
    });
    return response.data;
  } catch (error: any) {
    console.error('Paystack Initialize Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to initialize Paystack transaction');
  }
};

export const verifyTransaction = async (reference: string) => {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    return response.data;
  } catch (error: any) {
    console.error('Paystack Verify Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to verify Paystack transaction');
  }
};

export const listBanks = async () => {
  try {
    const response = await paystackApi.get('/bank');
    return response.data;
  } catch (error: any) {
    console.error('Paystack List Banks Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch banks from Paystack');
  }
};

export const resolveAccountNumber = async (accountNumber: string, bankCode: string) => {
  try {
    const response = await paystackApi.get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
    return response.data;
  } catch (error: any) {
    console.error('Paystack Resolve Account Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to resolve account number');
  }
};
