import { Router } from 'express';
import { AIService } from './ai.service';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate';
import { env } from '../../config/env';

export const aiRouter = Router();

aiRouter.use(requireAuth);

const chatSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(1000).trim(),
  apiKey: z.string().optional(),
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

aiRouter.get('/status', (req: AuthenticatedRequest, res) => {
  const customKey = (req.headers['x-gemini-key'] as string) || '';
  const hasKey = Boolean(customKey || env.GEMINI_API_KEY);
  res.json({
    success: true,
    hasGeminiKey: hasKey,
    activeEngine: hasKey ? 'Google Gemini 2.5 Flash' : 'NIMBO Conversational Engine (Local)',
  });
});

aiRouter.get('/greeting', async (req: AuthenticatedRequest, res, next) => {
  try {
    const greetingData = await AIService.getDailyGreeting(req.user!.id);
    res.json({
      success: true,
      ...greetingData,
    });
  } catch (err) {
    next(err);
  }
});

aiRouter.post('/chat', validateRequest(chatSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { message, history, apiKey: bodyApiKey } = req.body;
    const headerApiKey = (req.headers['x-gemini-key'] as string) || '';
    const activeKey = bodyApiKey || headerApiKey;

    const result = await AIService.processChat(req.user!.id, message, history, activeKey);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});
