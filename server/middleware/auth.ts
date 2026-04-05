import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};
