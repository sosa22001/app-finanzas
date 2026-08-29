import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env, missingEnv } from '../config/env';
import { asyncHandler } from '../middleware/error';

const router = Router();

/**
 * El plan gratuito de Supabase pausa el proyecto tras ~7 días sin actividad
 * de base de datos. Un cron diario (ver backend/vercel.json) llama a esta ruta
 * para mantenerlo despierto.
 *
 * Importante: la consulta tiene que tocar Postgres de verdad. Un ping a
 * /api/health no cuenta como actividad porque nunca llega a la base.
 * Va sin autenticar a propósito: el RLS hace que devuelva 0 filas, pero la
 * consulta sí se ejecuta, que es lo único que necesitamos.
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    if (missingEnv.length) {
      return res.status(500).json({ ok: false, error: `Faltan ${missingEnv.join(', ')}` });
    }

    const db = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const startedAt = Date.now();
    const { error } = await db.from('categories').select('id').limit(1);

    if (error) {
      console.error('[keepalive] Supabase respondió con error:', error.message);
      return res.status(503).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, ms: Date.now() - startedAt, at: new Date().toISOString() });
  }),
);

export default router;
