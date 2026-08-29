import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../middleware/error';

const router = Router();

const bodySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(60),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    let query = req.db.from('categories').select('*').order('name');
    const { type } = req.query;
    if (type === 'income' || type === 'expense') query = query.eq('type', type);

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
      .from('categories')
      .insert({ ...payload, user_id: req.userId })
      .select()
      .single();
    if (error) {
      throw new HttpError(400, error.code === '23505' ? 'Ya existe una categoría con ese nombre' : error.message);
    }
    res.status(201).json(data);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const payload = bodySchema.partial().parse(req.body);
    const { data, error } = await req.db
      .from('categories')
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
    const { error } = await req.db.from('categories').delete().eq('id', req.params.id);
    if (error) throw new HttpError(400, error.message);
    res.status(204).end();
  }),
);

/** Métodos de pago viven aquí para no inflar el router con otro archivo. */
router.get(
  '/payment-methods/all',
  asyncHandler(async (req, res) => {
    const { data, error } = await req.db.from('payment_methods').select('*').order('name');
    if (error) throw new HttpError(400, error.message);
    res.json(data);
  }),
);

export default router;
