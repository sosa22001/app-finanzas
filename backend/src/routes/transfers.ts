import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/error';

const router = Router();

const SELECT = `
  id, amount, description, date, created_at,
  from_account_id, to_account_id,
  from_account:accounts!transfers_from_account_id_fkey(id, name),
  to_account:accounts!transfers_to_account_id_fkey(id, name)
`;

const bodySchema = z
  .object({
    from_account_id: z.string().uuid(),
    to_account_id: z.string().uuid(),
    amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
    description: z.string().max(280).nullable().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  })
  .refine((v) => v.from_account_id !== v.to_account_id, {
    message: 'Las cuentas de origen y destino deben ser distintas',
    path: ['to_account_id'],
  });

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { data, error } = await req.db
      .from('transfers')
      .select(SELECT)
      .order('date', { ascending: false })
      .limit(Number(req.query.limit ?? 300));
    if (error) throw new HttpError(400, error.message);
    res.json(data);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = bodySchema.parse(req.body);
    const { data, error } = await req.db
      .from('transfers')
      .insert({ ...payload, user_id: req.userId })
      .select(SELECT)
      .single();
    if (error) throw new HttpError(400, error.message);
    res.status(201).json(data);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { error } = await req.db.from('transfers').delete().eq('id', req.params.id);
    if (error) throw new HttpError(400, error.message);
    res.status(204).end();
  }),
);

export default router;
