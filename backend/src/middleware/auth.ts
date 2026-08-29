import { NextFunction, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseForToken } from '../config/supabase';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
      db: SupabaseClient;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'No autenticado' });

  const db = supabaseForToken(token);
  const { data, error } = await db.auth.getUser(token);

  if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida' });

  req.userId = data.user.id;
  req.db = db;
  next();
}
