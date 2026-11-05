import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { apiRateLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';

import { authRouter } from './modules/auth/auth.router';
import { remindersRouter } from './modules/reminders/reminders.router';
import { categoriesRouter } from './modules/categories/categories.router';
import { statsRouter } from './modules/stats/stats.router';
import { pushRouter } from './modules/push/push.router';
import { aiRouter } from './modules/ai/ai.router';
import { processCronNotifications } from './worker/cronWorker';

export const app = express();

// Trust reverse proxy (Cloudflare Tunnel / localtunnel) for accurate client IP & rate limiting
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false, // For PWA asset flexibility
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      // In development allow localhost variations
      if (env.NODE_ENV === 'development' || origin === env.FRONTEND_URL) {
        return callback(null, true);
      }
      return callback(null, true); // Allow configured frontend
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(['/api', '/auth', '/reminders', '/categories', '/stats', '/push', '/ai'], apiRateLimiter);

// Health check endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({
    status: 'ok',
    app: 'NIMBO',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    envDiagnosis: {
      hasDatabaseUrl: Boolean(env.DATABASE_URL),
      hasVapidPublicKey: Boolean(env.VAPID_PUBLIC_KEY),
      hasSessionSecret: Boolean(env.SESSION_SECRET),
      envError: (env as any).envError,
    },
  });
});

// Cron notification trigger endpoint for serverless (Vercel Cron)
app.all(['/api/cron/notifications', '/cron/notifications'], async (req, res) => {
  if (env.CRON_SECRET) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized: invalid CRON_SECRET' });
    }
  }

  try {
    const result = await processCronNotifications();
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Error in cron notifications trigger:', error);
    return res.status(500).json({ error: 'Failed to process notifications' });
  }
});

// Mount modular API routers (supporting both /api/* and /* for reverse proxy flexibility)
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/reminders', '/reminders'], remindersRouter);
app.use(['/api/categories', '/categories'], categoriesRouter);
app.use(['/api/stats', '/stats'], statsRouter);
app.use(['/api/push', '/push'], pushRouter);
app.use(['/api/ai', '/ai'], aiRouter);

// Serve frontend static build on port 4000
const possibleDistPaths = [
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(__dirname, '../../frontend/dist'),
];

const frontendDist = possibleDistPaths.find((p) => fs.existsSync(p));
if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use(errorHandler);

export default app;
