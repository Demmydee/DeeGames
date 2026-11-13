import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAuth } from '../config/supabase';

export const GUEST_JWT_SECRET = process.env.JWT_SECRET || 'deegames-guest-demo-secret-key';

export const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Check if token is a Guest Demo JWT first
  try {
    const decoded = jwt.verify(token, GUEST_JWT_SECRET) as any;
    if (decoded && decoded.is_guest === true && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        username: decoded.username,
        is_guest: true,
        user_metadata: {
          username: decoded.username,
          is_guest: true
        }
      };
      req.token = token;
      return next();
    }
  } catch {
    // Not a guest token; continue to Supabase token verification
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

export const requireRegisteredUser = (req: any, res: Response, next: NextFunction) => {
  if (req.user?.is_guest) {
    return res.status(403).json({
      error: 'Guest demo accounts have limited access. Please register a free account to unlock this feature.',
      code: 'guest_restricted'
    });
  }
  next();
};

