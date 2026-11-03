import { z } from 'zod';

export const createReminderSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(200).trim(),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:mm)'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  categoryId: z.string().uuid().optional().nullable(),
  recurrence: z.enum(['NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM']).default('NONE'),
  recurrenceInterval: z.number().int().positive().optional().nullable(),
  advanceMinutes: z.number().int().min(0).max(10080).default(0), // max 1 week advance
  tags: z.array(z.string().max(30)).default([]),
});

export const updateReminderSchema = createReminderSchema.partial().extend({
  status: z.enum(['PENDING', 'COMPLETED', 'SNOOZED', 'OVERDUE']).optional(),
});

export const snoozeReminderSchema = z.object({
  minutes: z.number().int().positive().optional(),
  untilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  untilTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});
