import { Router } from 'express';
import { PushService } from './push.service';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validate';

export const pushRouter = Router();

pushRouter.use(requireAuth);

const subscribeSchema = z.object({
  endpoint: z.string().url('Endpoint de suscripción inválido'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  deviceName: z.string().optional(),
});

pushRouter.get('/public-key', (_req, res) => {
  res.json({
    success: true,
    publicKey: PushService.getPublicKey(),
  });
});

pushRouter.post(
  '/subscribe',
  validateRequest(subscribeSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { endpoint, keys, deviceName } = req.body;
      const sub = await PushService.saveSubscription({
        userId: req.user!.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'],
        deviceName,
      });

      res.status(201).json({
        success: true,
        message: 'Dispositivo registrado para recibir notificaciones.',
        subscriptionId: sub.id,
      });
    } catch (err) {
      next(err);
    }
  }
);

pushRouter.post('/unsubscribe', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushService.removeSubscription(endpoint);
    }
    res.json({ success: true, message: 'Dispositivo desuscrito correctamente.' });
  } catch (err) {
    next(err);
  }
});

pushRouter.get('/devices', async (req: AuthenticatedRequest, res, next) => {
  try {
    const devices = await PushService.listUserSubscriptions(req.user!.id);
    res.json({ success: true, devices });
  } catch (err) {
    next(err);
  }
});

pushRouter.post('/test', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await PushService.sendNotificationToUser(req.user!.id, {
      title: '🤖 NIMBO — Notificación de prueba',
      body: 'Tu dispositivo está correctamente conectado y listo para recibir recordatorios en tiempo real.',
      url: '/',
    });

    res.json({
      success: true,
      sentCount: result.sent,
      failedCount: result.failed,
      message: result.sent > 0
        ? `Notificación de prueba enviada exitosamente a ${result.sent} dispositivo(s).`
        : 'No se encontraron suscripciones activas para este usuario.',
    });
  } catch (err) {
    next(err);
  }
});
