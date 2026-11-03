import argon2 from 'argon2';
import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';

const SETUP_SETTING_KEY = 'SETUP_COMPLETED';
const SESSION_EXPIRATION_DAYS = 30;

const DEFAULT_CATEGORIES = [
  { name: 'Personal', color: '#176b55', icon: 'User', isDefault: true },
  { name: 'Trabajo', color: '#2563eb', icon: 'Briefcase', isDefault: true },
  { name: 'Estudio', color: '#7c3aed', icon: 'BookOpen', isDefault: true },
  { name: 'Salud', color: '#e11d48', icon: 'HeartPulse', isDefault: true },
  { name: 'Finanzas', color: '#059669', icon: 'Wallet', isDefault: true },
  { name: 'Familia', color: '#d97706', icon: 'Home', isDefault: true },
  { name: 'Otros', color: '#475569', icon: 'Tag', isDefault: true },
];

export class AuthService {
  static async isSetupCompleted(): Promise<boolean> {
    const setting = await prisma.appSetting.findUnique({
      where: { key: SETUP_SETTING_KEY },
    });
    if (setting?.value === 'true') return true;

    const userCount = await prisma.user.count();
    return userCount > 0;
  }

  static async setupOwner(data: {
    setupSecret: string;
    email: string;
    password: string;
    name: string;
    timezone?: string;
  }) {
    const isCompleted = await this.isSetupCompleted();
    if (isCompleted) {
      const error = new Error('El sistema ya cuenta con un propietario configurado. No se permiten registros adicionales.');
      (error as unknown as { statusCode: number }).statusCode = 403;
      throw error;
    }

    if (data.setupSecret !== env.SETUP_SECRET) {
      const error = new Error('El secreto de instalación proporcionado es incorrecto.');
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash,
          timezone: data.timezone || 'America/Mexico_City',
        },
      });

      // Create default categories for the owner
      for (const cat of DEFAULT_CATEGORIES) {
        await tx.category.create({
          data: {
            userId: newUser.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon,
            isDefault: cat.isDefault,
          },
        });
      }

      // Mark setup as permanently completed
      await tx.appSetting.upsert({
        where: { key: SETUP_SETTING_KEY },
        create: { key: SETUP_SETTING_KEY, value: 'true' },
        update: { value: 'true' },
      });

      return newUser;
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    };
  }

  static async login(data: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      const error = new Error('Credenciales incorrectas.');
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    const isValid = await argon2.verify(user.passwordHash, data.password);
    if (!isValid) {
      const error = new Error('Credenciales incorrectas.');
      (error as unknown as { statusCode: number }).statusCode = 401;
      throw error;
    }

    // Generate secure session token
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRATION_DAYS);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        userAgent: data.userAgent || 'Desconocido',
        ipAddress: data.ipAddress || 'Desconocido',
        expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      },
      sessionToken: session.token,
      expiresAt: session.expiresAt,
    };
  }

  static async logout(token: string) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  static async revokeOtherSessions(userId: string, currentSessionId: string) {
    const result = await prisma.session.deleteMany({
      where: {
        userId,
        id: { not: currentSessionId },
      },
    });
    return result.count;
  }

  static async listSessions(userId: string, currentSessionId: string) {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastActiveAt: true,
        expiresAt: true,
      },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));
  }

  static async updateProfile(
    userId: string,
    updates: {
      name?: string;
      timezone?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const dataToUpdate: { name?: string; timezone?: string; passwordHash?: string } = {};

    if (updates.name) dataToUpdate.name = updates.name.trim();
    if (updates.timezone) dataToUpdate.timezone = updates.timezone.trim();

    if (updates.newPassword) {
      if (!updates.currentPassword) {
        const error = new Error('Debes proporcionar tu contraseña actual para cambiarla.');
        (error as unknown as { statusCode: number }).statusCode = 400;
        throw error;
      }

      const validCurrent = await argon2.verify(user.passwordHash, updates.currentPassword);
      if (!validCurrent) {
        const error = new Error('La contraseña actual es incorrecta.');
        (error as unknown as { statusCode: number }).statusCode = 400;
        throw error;
      }

      dataToUpdate.passwordHash = await argon2.hash(updates.newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
      },
    });

    return updated;
  }
}
