import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre de la categoría es requerido').max(40).trim(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hexadecimal inválido (ej. #176b55)'),
  icon: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(40).trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
});
