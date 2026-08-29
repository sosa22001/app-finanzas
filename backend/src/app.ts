import express from 'express';
import cors from 'cors';
import { env, missingEnv } from './config/env';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/error';

import accounts from './routes/accounts';
import budgets from './routes/budgets';
import categories from './routes/categories';
import dashboard from './routes/dashboard';
import goals from './routes/goals';
import loans from './routes/loans';
import transactions from './routes/transactions';
import transfers from './routes/transfers';

export const app = express();

const allowedOrigins = env.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) return true;
  try {
    // Cualquier deploy o preview de Vercel
    return /\.vercel\.app$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin = curl / health checks / apps móviles
      if (!origin || isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`Origen no permitido: ${origin}`));
    },
  }),
);

app.use(express.json());

/** Diagnóstico: confirma que la función vive y si le falta configuración. */
app.get('/api/health', (_req, res) => {
  if (missingEnv.length) {
    return res.status(500).json({
      ok: false,
      error: `Faltan variables de entorno: ${missingEnv.join(', ')}`,
      hint: 'Vercel → Settings → Environment Variables, luego Redeploy.',
    });
  }
  return res.json({ ok: true });
});

// Todo lo demás requiere sesión de Supabase
app.use('/api/transactions', requireAuth, transactions);
app.use('/api/accounts', requireAuth, accounts);
app.use('/api/categories', requireAuth, categories);
app.use('/api/transfers', requireAuth, transfers);
app.use('/api/budgets', requireAuth, budgets);
app.use('/api/goals', requireAuth, goals);
app.use('/api/dashboard', requireAuth, dashboard);
app.use('/api/loans', requireAuth, loans);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);

/**
 * Vercel usa este archivo como entrypoint de la Serverless Function y exige
 * un default export que sea una función o un servidor. La app de Express lo es.
 */
export default app;
