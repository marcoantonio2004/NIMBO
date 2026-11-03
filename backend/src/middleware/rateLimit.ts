import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP
  message: {
    success: false,
    error: 'Demasiados intentos de autenticación. Por favor intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // Max 180 requests per minute
  message: {
    success: false,
    error: 'Límite de solicitudes alcanzado. Espera un momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
