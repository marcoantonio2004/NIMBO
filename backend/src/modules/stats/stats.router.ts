import { Router } from 'express';
import { StatsService } from './stats.service';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

export const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get('/dashboard', async (req: AuthenticatedRequest, res, next) => {
  try {
    const today = (req.query.today as string) || new Date().toISOString().split('T')[0];
    const metrics = await StatsService.getDashboardMetrics(req.user!.id, today);
    res.json({ success: true, metrics });
  } catch (err) {
    next(err);
  }
});
