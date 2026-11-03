import { Router } from 'express';
import { CategoriesService } from './categories.service';
import { createCategorySchema, updateCategorySchema } from './categories.schema';
import { validateRequest } from '../../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const list = await CategoriesService.list(req.user!.id);
    res.json({ success: true, categories: list });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.post(
  '/',
  validateRequest(createCategorySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const created = await CategoriesService.create(req.user!.id, req.body);
      res.status(201).json({ success: true, category: created });
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      if (errorObj.statusCode) {
        return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
      }
      next(err);
    }
  }
);

categoriesRouter.patch(
  '/:id',
  validateRequest(updateCategorySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const updated = await CategoriesService.update(req.user!.id, req.params.id as string, req.body);
      res.json({ success: true, category: updated });
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      if (errorObj.statusCode) {
        return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
      }
      next(err);
    }
  }
);

categoriesRouter.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await CategoriesService.delete(req.user!.id, req.params.id as string);
    res.json(result);
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string };
    if (errorObj.statusCode) {
      return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
    }
    next(err);
  }
});
