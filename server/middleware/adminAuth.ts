import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-admin-jwt-secret-key-102938';

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export const authenticateAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No admin token provided.' });
  }

  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any;
    
    if (!decoded || !decoded.id || !decoded.email) {
      return res.status(401).json({ error: 'Invalid admin token.' });
    }

    // Verify admin exists and is active in the database
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, email, role, name, is_active')
      .eq('id', decoded.id)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Admin account not found.' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ error: 'Admin account has been deactivated.' });
    }

    // Attach admin details to the request object
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name
    };

    next();
  } catch (error: any) {
    console.error('Admin verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin token expired.', code: 'admin_token_expired' });
    }
    return res.status(401).json({ error: 'Authentication failed. Please log in again.' });
  }
};

// Role authorization helper
export const requireRole = (allowedRoles: string[]) => {
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // super_admin always bypasses role checks
    if (req.admin.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: `Forbidden. Role '${req.admin.role}' does not have this permission.` });
    }

    next();
  };
};
