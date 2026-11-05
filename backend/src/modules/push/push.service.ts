import webpush from 'web-push';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';

// Configure Web Push with VAPID credentials when available
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      env.VAPID_SUBJECT || 'mailto:propietario@nimbo.local',
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.warn('Warning: Failed to set VAPID details:', err);
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export class PushService {
  static getPublicKey(): string {
    return env.VAPID_PUBLIC_KEY;
  }

  static async saveSubscription(data: {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
    deviceName?: string;
  }) {
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        deviceName: data.deviceName || 'Navegador Web',
      },
      update: {
        userId: data.userId,
        p256dh: data.p256dh,
        auth: data.auth,
        userAgent: data.userAgent,
        deviceName: data.deviceName || 'Navegador Web',
      },
    });

    return subscription;
  }

  static async removeSubscription(endpoint: string) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }

  static async listUserSubscriptions(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async sendNotificationToUser(
    userId: string,
    payload: PushPayload,
    reminderId?: string
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/favicon-32.png',
      url: payload.url || '/',
      tag: payload.tag || reminderId || 'nimbo-notification',
      vibrate: [200, 100, 200],
      data: payload.data || {},
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushConfig, jsonPayload);
        sent++;

        await prisma.notificationLog.create({
          data: {
            reminderId: reminderId || null,
            subscriptionId: sub.id,
            title: payload.title,
            body: payload.body,
            status: 'SENT',
          },
        });
      } catch (err: unknown) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        console.error(`Push send failure to device ${sub.id}:`, statusCode || err);

        // Status 404 or 410 means the subscription has expired or unsubscribed
        if (statusCode === 410 || statusCode === 404) {
          console.log(`Removing expired subscription: ${sub.id}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }

        await prisma.notificationLog.create({
          data: {
            reminderId: reminderId || null,
            subscriptionId: sub.id,
            title: payload.title,
            body: payload.body,
            status: 'FAILED',
            error: String(err),
          },
        });
      }
    }

    return { sent, failed };
  }
}
