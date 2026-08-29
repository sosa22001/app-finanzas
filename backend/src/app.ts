import express from 'express';
import cors from 'cors';
import { env } from './config/env';
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

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin = curl / health checks / apps móviles
      if (!origin) return callback(null, true);
      // Cualquier deploy o preview de Vercel, más lo que se liste en CORS_ORIGIN
      if (allowedOrigins.includes(origin) || /\.vercel\.app$/.test(new URL(origin).hostname)) {
        return callback(null, true);
      }
      return callback(new Error(`Origen no permitido: ${origin}`));
    },
  }),
);
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Todo lo demás requiere sesión de Supabase
app.use('/api/transactions', requireAuth, transactions);
app.use('/api/accounts', requireAuth, accounts);
app.use('/api/categories', requireAuth, categories);
app.use('/api/transfers', requireAuth, transfers);
app.use('/api/budgets', requireAuth, budgets);
app.use('/api/goals', requireAuth, goals);
app.use('/api/loans', requireAuth, loans);
app.use('/api/dashboard', requireAuth, dashboard);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use(errorHandler);
