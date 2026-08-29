import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/error';

const router = Router();

const bodySchema = z.object({
  direction: z.enum(['lent', 'borrowed']),
  person: z.string().min(1, 'Escribe el nombre de la persona').max(80),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().max(280).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive('El abono debe ser mayor a 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(160).nullable().optional(),
});

/** Préstamos con lo abonado y lo pendiente calculado desde loan_payments. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    let query = req.db
      .from('loans')
      .select('*, payments:loan_payments(id, amount, date, note)')
      .order('date', { ascending: false });

    const { direction } = req.query;
    if (direction === 'lent' || direction === 'borrowed') query = query.eq('direction', direction);

    const { data, error } = await query;
    if (error) throw new HttpError(400, error.message);

    res.json(
      (data ?? []).map((l) => {
        const total = Number(l.amount);
        const paid = (l.payments ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0);
        const pending = Math.max(total - paid, 0);
        return {
          ...l,
          amount: total,
          paid,
          pending,
          percent: total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0,
          settled: pending <= 0,
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
      .from('loans')
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
      .from('loans')
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
    const { error } = await req.db.from('loans').delete().eq('id', req.params.id);
    if (error) throw new HttpError(400, error.message);
    res.status(204).end();
  }),
);

/** Registrar un abono al préstamo. */
router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const payload = paymentSchema.parse(req.body);
    const { data, error } = await req.db
      .from('loan_payments')
      .insert({ ...payload, loan_id: req.params.id, user_id: req.userId })
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    res.status(201).json(data);
  }),
);

export default router;
