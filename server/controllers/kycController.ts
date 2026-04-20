import { Response } from 'express';
import { getUserById } from '../services/authService';

export const getKycStatus = async (req: any, res: Response) => {
  try {
    const user = await getUserById(req.user.id);

    res.status(200).json({
      status: user.kyc_status,
      verifiedAt: user.kyc_verified_at || null,
      withdrawalsAllowed: user.kyc_status === 'verified' || process.env.REQUIRE_KYC_FOR_WITHDRAWAL !== 'true'
    });
  } catch (error: any) {
    console.error('KYC Status Controller Error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
};
