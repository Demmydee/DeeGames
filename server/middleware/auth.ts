import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAuth } from '../config/supabase';

export const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Check server time to help debug "expired" tokens
    const now = Math.floor(Date.now() / 1000);
    const { data, error } = await supabaseAuth.auth.getUser(token);
    
    if (error || !data?.user) {
      if (error?.message?.includes('expired')) {
        return res.status(401).json({ error: 'Token expired', code: 'token_expired' });
      }
      console.error(`Auth Middleware Error (Time: ${now}):`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    
    req.user = data.user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Auth Middleware Vital Error:', error);
    res.status(401).json({ error: 'Authentication failed.' });
  }
};
