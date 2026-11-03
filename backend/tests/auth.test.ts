import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';
import { env } from '../src/config/env';

describe('Auth & Single Owner Flow', () => {
  beforeAll(async () => {
    // Clean test state
    await prisma.session.deleteMany();
    await prisma.reminder.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.appSetting.deleteMany();
  });

  it('reports setup not completed when no owner exists', async () => {
    const res = await request(app).get('/api/auth/status');
    expect(res.status).toBe(200);
    expect(res.body.setupCompleted).toBe(false);
  });

  it('rejects setup with invalid setupSecret', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        setupSecret: 'wrong-secret',
        email: 'owner@nimbo.local',
        password: 'PasswordSegura2026!',
        name: 'Propietario Nimbo',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('successfully creates the single owner account with valid secret', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        setupSecret: env.SETUP_SECRET,
        email: 'owner@nimbo.local',
        password: 'PasswordSegura2026!',
        name: 'Propietario Nimbo',
        timezone: 'America/Mexico_City',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('owner@nimbo.local');
    expect(res.body.token).toBeDefined();
  });

  it('strictly rejects any secondary setup attempt once owner exists', async () => {
    const res = await request(app)
      .post('/api/auth/setup')
      .send({
        setupSecret: env.SETUP_SECRET,
        email: 'attacker@intruder.com',
        password: 'IntruderPassword123!',
        name: 'Intruder',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('ya cuenta con un propietario');
  });

  it('authenticates owner with correct credentials and returns session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner@nimbo.local',
        password: 'PasswordSegura2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'owner@nimbo.local',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
