import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/error';

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(80),
  description: z.string().max(280).nullable().optional(),
  target_amount: z.coerce.number().positive('El objetivo debe ser mayor a 0'),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const contributionSchema = z.object({
  amount: z.coerce.number().refine((n) => n !== 0, 'El monto no puede ser 0'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(160).nullable().optional(),
});

/** Metas con monto actual y progreso calculados desde las contribuciones. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { data, error } = await req.db
      .from('goals')
      .select('*, contributions:goal_contributions(id, amount, date, note)')
      .order('created_at', { ascending: false });
    if (error) throw new HttpError(400, error.message);

    res.json(
      (data ?? []).map((g) => {
        const target = Number(g.target_amount);
        const current = (g.contributions ?? []).reduce(
          (sum: number, c: { amount: number }) => sum + Number(c.amount),
          0,
        );
        return {
          ...g,
          target_amount: target,
          current_amount: current,
          remaining: Math.max(target - current, 0),
          percent: target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0,
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
      .from('goals')
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
    const payload = bodySchema.partial().extend({ completed: z.boolean().optional() }).parse(req.body);
    const { data, error } = await req.db
      .from('goals')
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
    const { error } = await req.db.from('goals').delete().eq('id', req.params.id);
    if (error) throw new HttpError(400, error.message);
    res.status(204).end();
  }),
);

/** Agregar (o retirar, con monto negativo) dinero de una meta. */
router.post(
  '/:id/contributions',
  asyncHandler(async (req, res) => {
    const payload = contributionSchema.parse(req.body);
    const { data, error } = await req.db
      .from('goal_contributions')
      .insert({ ...payload, goal_id: req.params.id, user_id: req.userId })
      .select()
      .single();
    if (error) throw new HttpError(400, error.message);
    res.status(201).json(data);
  }),
);

export default router;
