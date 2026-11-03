import { Router } from 'express';
import { RemindersService } from './reminders.service';
import {
  createReminderSchema,
  updateReminderSchema,
  snoozeReminderSchema,
} from './reminders.schema';
import { validateRequest } from '../../middleware/validate';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { ReminderStatus, Priority } from '@prisma/client';

export const remindersRouter = Router();

remindersRouter.use(requireAuth);

remindersRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, date, dateFrom, dateTo, categoryId, priority, search } = req.query;

    const list = await RemindersService.list(req.user!.id, {
      status: status as ReminderStatus | 'active',
      date: date as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      categoryId: categoryId as string,
      priority: priority as Priority,
      search: search as string,
    });

    res.json({ success: true, reminders: list });
  } catch (err) {
    next(err);
  }
});

remindersRouter.post(
  '/',
  validateRequest(createReminderSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const created = await RemindersService.create(req.user!.id, req.body);
      res.status(201).json({ success: true, reminder: created });
    } catch (err) {
      next(err);
    }
  }
);

remindersRouter.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const reminder = await RemindersService.getById(req.user!.id, req.params.id as string);
    res.json({ success: true, reminder });
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string };
    if (errorObj.statusCode) {
      return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
    }
    next(err);
  }
});

remindersRouter.patch(
  '/:id',
  validateRequest(updateReminderSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const updated = await RemindersService.update(req.user!.id, req.params.id as string, req.body);
      res.json({ success: true, reminder: updated });
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      if (errorObj.statusCode) {
        return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
      }
      next(err);
    }
  }
);

remindersRouter.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await RemindersService.delete(req.user!.id, req.params.id as string);
    res.json(result);
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string };
    if (errorObj.statusCode) {
      return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
    }
    next(err);
  }
});

remindersRouter.post('/:id/toggle', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await RemindersService.toggleComplete(req.user!.id, req.params.id as string);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string };
    if (errorObj.statusCode) {
      return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
    }
    next(err);
  }
});

remindersRouter.post(
  '/:id/snooze',
  validateRequest(snoozeReminderSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const updated = await RemindersService.snooze(req.user!.id, req.params.id as string, req.body);
      res.json({ success: true, reminder: updated });
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      if (errorObj.statusCode) {
        return res.status(errorObj.statusCode).json({ success: false, error: errorObj.message });
      }
      next(err);
    }
  }
);

remindersRouter.post('/clear-completed', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await RemindersService.clearCompleted(req.user!.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});
