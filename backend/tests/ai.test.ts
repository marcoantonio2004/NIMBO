import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { env } from '../src/config/env';

describe('AI Conversational Assistant', () => {
  let sessionToken = '';

  beforeAll(async () => {
    await prisma.session.deleteMany();
    await prisma.reminder.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.appSetting.deleteMany();

    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        setupSecret: env.SETUP_SECRET,
        email: 'ai-tester@nimbo.local',
        password: 'PasswordIA2026!',
        name: 'AI Tester',
      });

    sessionToken = setupRes.body.token;
  });

  it('interprets natural language and creates real reminder in DB', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        message: 'Recuérdame mañana a las 8 de la mañana llamar al hospital',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.toolExecuted).toBe('crear_recordatorio');
    expect(res.body.response).toContain('llamar al hospital');

    // Verify it actually persisted in PostgreSQL!
    const inDb = await prisma.reminder.findFirst({
      where: { title: { contains: 'llamar al hospital', mode: 'insensitive' } },
    });
    expect(inDb).not.toBeNull();
    expect(inDb?.time).toBe('08:00');
  });

  it('queries pending reminders accurately from database', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        message: '¿Qué actividades tengo pendientes?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.toolExecuted).toBe('consultar_recordatorios');
    expect(res.body.response).toContain('llamar al hospital');
  });
});
