import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:3000/api/wallet/deposit/callback',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  },
  
  wallet: {
    minDeposit: Number(process.env.MIN_DEPOSIT_AMOUNT) || 100,
    maxDeposit: Number(process.env.MAX_DEPOSIT_AMOUNT) || 1000000,
    minWithdrawal: Number(process.env.MIN_WITHDRAWAL_AMOUNT) || 500,
    maxWithdrawal: Number(process.env.MAX_WITHDRAWAL_AMOUNT) || 500000,
    requireKycForWithdrawal: process.env.REQUIRE_KYC_FOR_WITHDRAWAL === 'true',
  }
};
