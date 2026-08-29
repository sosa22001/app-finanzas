import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/error';
import { monthRange } from '../services/dates';

const router = Router();

const bodySchema = z.object({
  category_id: z.string().uuid(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

/** GET /api/budgets?month=&year= — incluye lo gastado y lo disponible. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const month = Number(req.query.month ?? now.getMonth() + 1);
    const year = Number(req.query.year ?? now.getFullYear());
    const { start, end } = monthRange(year, month);

    const [budgets, spent] = await Promise.all([
      req.db
        .from('budgets')
        .select('id, amount, month, year, category_id, category:categories(id, name, color)')
        .eq('month', month)
        .eq('year', year),
      req.db
        .from('transactions')
        .select('category_id, amount')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end),
    ]);

    if (budgets.error) throw new HttpError(400, budgets.error.message);
    if (spent.error) throw new HttpError(400, spent.error.message);

    const spentByCategory = new Map<string, number>();
    for (const t of spent.data ?? []) {
      if (!t.category_id) continue;
      spentByCategory.set(t.category_id, (spentByCategory.get(t.category_id) ?? 0) + Number(t.amount));
    }

    res.json(
      (budgets.data ?? []).map((b) => {
        const amount = Number(b.amount);
        const used = spentByCategory.get(b.category_id) ?? 0;
        return {
          ...b,
          amount,
          spent: used,
          available: amount - used,
          percent: amount > 0 ? Math.round((used / amount) * 100) : 0,
        };
      }),
    );
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = bodySchema.parse(req.body);
    const { data, error } = await req.db
      .from('budgets')
      .upsert({ ...payload, user_id: req.userId }, { onConflict: 'user_id,category_id,month,year' })
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    res.status(201).json(data);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = bodySchema.partial().parse(req.body);
    const { data, error } = await req.db
      .from('budgets')
      .update(payload)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    res.json(data);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { error } = await req.db.from('budgets').delete().eq('id', req.params.id);
    if (error) throw new HttpError(400, error.message);
    res.status(204).end();
  }),
);

export default router;
