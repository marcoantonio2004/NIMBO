import { z } from 'zod';

export const setupOwnerSchema = z.object({
  setupSecret: z.string().min(1, 'El secreto de instalación es requerido'),
  email: z.string().email('Correo electrónico no válido').toLowerCase().trim(),
  password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
  timezone: z.string().default('America/Mexico_City'),
});

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico no válido').toLowerCase().trim(),
  password: z.string().min(1, 'La contraseña es requerida'),
  deviceName: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(10).optional(),
});
