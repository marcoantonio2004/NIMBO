import { Router, Response } from 'express';
import { AuthService } from './auth.service';
import { setupOwnerSchema, loginSchema, updateProfileSchema } from './auth.schema';
import { validateRequest } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { env } from '../../config/env';

export const authRouter = Router();

const COOKIE_NAME = 'nimbo_session';

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: expiresAt,
    path: '/',
  });
}

authRouter.get('/status', async (_req, res, next) => {
  try {
    const isCompleted = await AuthService.isSetupCompleted();
    res.json({
      success: true,
      setupCompleted: isCompleted,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/setup',
  authRateLimiter,
  validateRequest(setupOwnerSchema),
  async (req, res, next) => {
    try {
      const user = await AuthService.setupOwner(req.body);

      // Automatically log the new owner in
      const loginRes = await AuthService.login({
        email: user.email,
        password: req.body.password,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      setSessionCookie(res, loginRes.sessionToken, loginRes.expiresAt);

      res.status(201).json({
        success: true,
        message: '¡Bienvenido a Nimbo! Cuenta propietaria configurada exitosamente.',
        user: loginRes.user,
        token: loginRes.sessionToken,
      });
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      if (errorObj.statusCode) {
        return res.status(errorObj.statusCode).json({
          success: false,
          error: errorObj.message,
        });
      }
      next(err);
    }
  }
);

authRouter.post(
  '/login',
  authRateLimiter,
  validateRequest(loginSchema),
  async (req, res, next) => {
    try {
      const loginRes = await AuthService.login({
        email: req.body.email,
        password: req.body.password,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      setSessionCookie(res, loginRes.sessionToken, loginRes.expiresAt);

      res.json({
        success: true,
        user: loginRes.user,
        token: loginRes.sessionToken,
      });
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      if (errorObj.statusCode) {
        return res.status(errorObj.statusCode).json({
          success: false,
          error: errorObj.message,
        });
      }
      next(err);
    }
  }
);

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.session?.token) {
      await AuthService.logout(req.session.token);
    }
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true, message: 'Sesión cerrada correctamente.' });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
      name: req.user!.name,
      timezone: req.user!.timezone,
    },
  });
});

authRouter.get('/sessions', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const sessions = await AuthService.listSessions(req.user!.id, req.session!.id);
    res.json({
      success: true,
      sessions,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/sessions/revoke-others', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const count = await AuthService.revokeOtherSessions(req.user!.id, req.session!.id);
    res.json({
      success: true,
      message: `Se cerraron ${count} sesiones en otros dispositivos.`,
      revokedCount: count,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.patch(
  '/profile',
  requireAuth,
  validateRequest(updateProfileSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const updated = await AuthService.updateProfile(req.user!.id, req.body);
      res.json({
        success: true,
        user: updated,
        message: 'Perfil actualizado correctamente.',
      });
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      if (errorObj.statusCode) {
        return res.status(errorObj.statusCode).json({
          success: false,
          error: errorObj.message,
        });
      }
      next(err);
    }
  }
);
