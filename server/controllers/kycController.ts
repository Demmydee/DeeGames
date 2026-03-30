import { Response } from 'express';
import { supabase } from '../config/supabase';

export const getKycStatus = async (req: any, res: Response) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('kyc_status, kyc_verified_at')
      .eq('id', req.user.id)
      .single();

    if (error) throw new Error('Failed to fetch KYC status');

    res.status(200).json({
      status: user.kyc_status,
      verifiedAt: user.kyc_verified_at,
      withdrawalsAllowed: user.kyc_status === 'verified' || process.env.REQUIRE_KYC_FOR_WITHDRAWAL !== 'true'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
