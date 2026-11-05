import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars'),
  SETUP_SECRET: z.string().min(8, 'SETUP_SECRET is required'),
  FRONTEND_URL: z.string().default('http://localhost:5200'),
  VAPID_PUBLIC_KEY: z.string().min(1, 'VAPID_PUBLIC_KEY is required'),
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required'),
  VAPID_SUBJECT: z.string().default('mailto:propietario@nimbo.local'),
  GEMINI_API_KEY: z.string().optional().default(''),
  CRON_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

export const env = parsed.success
  ? { ...parsed.data, envError: null }
  : {
      PORT: 4000,
      NODE_ENV: 'production' as const,
      DATABASE_URL: process.env.DATABASE_URL || '',
      DIRECT_URL: process.env.DIRECT_URL || '',
      SESSION_SECRET: process.env.SESSION_SECRET || '',
      SETUP_SECRET: process.env.SETUP_SECRET || '',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5200',
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
      VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:propietario@nimbo.local',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      CRON_SECRET: process.env.CRON_SECRET || '',
      envError: parsed.error.format(),
    };

if (!parsed.success) {
  console.error('Environment configuration warning (non-fatal):', parsed.error.format());
}
