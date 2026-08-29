import { Router } from 'express';
import { asyncHandler } from '../middleware/error';
import { buildDashboard } from '../services/dashboard';

const router = Router();

// GET /api/dashboard?month=&year=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const month = Number(req.query.month ?? now.getMonth() + 1);
    const year = Number(req.query.year ?? now.getFullYear());
    res.json(await buildDashboard(req.db, year, month));
  }),
);

export default router;
