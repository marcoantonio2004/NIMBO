import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { User, Session } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: Session;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const tokenFromCookie = req.cookies?.['nimbo_session'];
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : undefined;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Autenticación requerida. Inicia sesión para continuar.',
      });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      res.clearCookie('nimbo_session');
      return res.status(401).json({
        success: false,
        error: 'Sesión no válida o revocada.',
      });
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      res.clearCookie('nimbo_session');
      return res.status(401).json({
        success: false,
        error: 'La sesión ha expirado. Por favor ingresa nuevamente.',
      });
    }

    // Refresh last active if more than 5 minutes have passed
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (session.lastActiveAt < fiveMinutesAgo) {
      prisma.session
        .update({
          where: { id: session.id },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    }

    req.user = session.user;
    req.session = session;
    next();
  } catch (err) {
    next(err);
  }
}
