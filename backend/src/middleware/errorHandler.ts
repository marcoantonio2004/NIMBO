import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Error de validación en los datos proporcionados.',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  console.error('Unhandled error:', err);

  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Ocurrió un error inesperado en el servidor.' : message,
  });
}
