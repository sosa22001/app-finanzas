import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/error';

const router = Router();

const SELECT = `
  id, type, amount, description, date, created_at,
  account_id, category_id, payment_method_id,
  account:accounts(id, name),
  category:categories(id, name, color),
  payment_method:payment_methods(id, name)
`;

const bodySchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  account_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  payment_method_id: z.string().uuid().nullable().optional(),
  description: z.string().max(280).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
});

// GET /api/transactions?type=&category_id=&account_id=&from=&to=&search=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, category_id, account_id, from, to, search, limit } = req.query;

    let query = req.db.from('transactions').select(SELECT).order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(Number(limit ?? 500));

    if (type === 'income' || type === 'expense') query = query.eq('type', type);
    if (typeof category_id === 'string' && category_id) query = query.eq('category_id', category_id);
    if (typeof account_id === 'string' && account_id) query = query.eq('account_id', account_id);
    if (typeof from === 'string' && from) query = query.gte('date', from);
    if (typeof to === 'string' && to) query = query.lte('date', to);
    if (typeof search === 'string' && search) query = query.ilike('description', `%${search}%`);

    const { data, error } = await query;
    if (error) throw new HttpError(400, error.message);
    res.json(data);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = bodySchema.parse(req.body);
    const { data, error } = await req.db
      .from('transactions')
      .insert({ ...payload, user_id: req.userId })
      .select(SELECT)
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
      .from('transactions')
      .update(payload)
      .eq('id', req.params.id)
      .select(SELECT)
      .single();
    if (error) throw new HttpError(400, error.message);
    res.json(data);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { error } = await req.db.from('transactions').delete().eq('id', req.params.id);
    if (error) throw new HttpError(400, error.message);
    res.status(204).end();
  }),
);

export default router;
