import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { env } from '../src/config/env';

describe('Reminders API & Recurrence Engine', () => {
  let sessionToken = '';
  let userId = '';

  beforeAll(async () => {
    // Reset and initialize owner
    await prisma.session.deleteMany();
    await prisma.reminder.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.appSetting.deleteMany();

    const setupRes = await request(app)
      .post('/api/auth/setup')
      .send({
        setupSecret: env.SETUP_SECRET,
        email: 'tester@nimbo.local',
        password: 'SuperPassword2026!',
        name: 'Tester Nimbo',
      });

    sessionToken = setupRes.body.token;
    userId = setupRes.body.user.id;
  });

  it('creates a new reminder in PostgreSQL', async () => {
    const res = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        title: 'Llamar al médico especialista',
        description: 'Pedir cita para revisión periódica',
        date: '2026-11-10',
        time: '11:30',
        priority: 'HIGH',
        advanceMinutes: 15,
        recurrence: 'NONE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.reminder.title).toBe('Llamar al médico especialista');
    expect(res.body.reminder.status).toBe('PENDING');
  });

  it('lists reminders with filtering', async () => {
    const res = await request(app)
      .get('/api/reminders?priority=HIGH')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reminders.length).toBe(1);
  });

  it('handles recurring reminder completion and creates next instance automatically', async () => {
    // 1. Create a daily recurring reminder
    const createRes = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        title: 'Tomar vitamina C',
        date: '2026-11-05',
        time: '08:00',
        priority: 'MEDIUM',
        recurrence: 'DAILY',
      });

    const reminderId = createRes.body.reminder.id;

    // 2. Mark as completed
    const toggleRes = await request(app)
      .post(`/api/reminders/${reminderId}/toggle`)
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.completed.status).toBe('COMPLETED');
    expect(toggleRes.body.nextOccurrence).toBeDefined();
    // Daily recurrence on 2026-11-05 should create 2026-11-06
    expect(toggleRes.body.nextOccurrence.date).toBe('2026-11-06');
    expect(toggleRes.body.nextOccurrence.status).toBe('PENDING');
  });

  it('snoozes a reminder by adding minutes', async () => {
    const createRes = await request(app)
      .post('/api/reminders')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        title: 'Revisión técnica',
        date: '2026-11-05',
        time: '14:00',
        priority: 'LOW',
      });

    const reminderId = createRes.body.reminder.id;

    const snoozeRes = await request(app)
      .post(`/api/reminders/${reminderId}/snooze`)
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ minutes: 30 });

    expect(snoozeRes.status).toBe(200);
    expect(snoozeRes.body.reminder.status).toBe('SNOOZED');
    expect(snoozeRes.body.reminder.time).toBe('14:30');
  });

  it('triggers cron notification processing endpoint', async () => {
    const cronRes = await request(app).get('/api/cron/notifications');
    expect(cronRes.status).toBe(200);
    expect(cronRes.body.status).toBe('ok');
    expect(cronRes.body.processed).toBeGreaterThanOrEqual(0);
  });
});
