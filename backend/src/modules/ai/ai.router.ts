import { Router } from 'express';
import { AIService } from './ai.service';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate';

export const aiRouter = Router();

aiRouter.use(requireAuth);

const chatSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(1000).trim(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'model']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

aiRouter.post('/chat', validateRequest(chatSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { message, history } = req.body;
    const result = await AIService.processChat(req.user!.id, message, history);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});
