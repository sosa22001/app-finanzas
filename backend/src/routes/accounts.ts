import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/error';

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(80),
  type: z.enum(['cash', 'checking', 'savings', 'credit_card', 'investment', 'other']),
  initial_balance: z.coerce.number().default(0),
  currency: z.string().length(3).default('HNL'),
  institution: z.string().max(80).nullable().optional(),
  // solo los 4 últimos dígitos, nunca el número completo
  last4: z.string().regex(/^\d{4}$/).nullable().optional(),
});

/** Devuelve las cuentas con su balance calculado desde la vista account_balances. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { data, error } = await req.db
      .from('account_balances')
      .select('*')
      .eq('archived', false)
      .order('name');
    if (error) throw new HttpError(400, error.message);
    res.json((data ?? []).map((a) => ({ ...a, id: a.account_id })));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = bodySchema.parse(req.body);
    const { data, error } = await req.db
      .from('accounts')
      .insert({ ...payload, user_id: req.userId })
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
      .from('accounts')
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
    const { error } = await req.db.from('accounts').delete().eq('id', req.params.id);
    if (error) throw new HttpError(400, error.message);
    res.status(204).end();
  }),
);

export default router;
