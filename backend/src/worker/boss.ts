import PgBoss from 'pg-boss';
import { env } from '../config/env';

export const REMINDER_QUEUE = 'send-reminder-notification';

let bossInstance: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (!bossInstance) {
    bossInstance = new PgBoss({
      connectionString: env.DATABASE_URL,
      // Retry policy and concurrency limits
      retryLimit: 3,
      retryDelay: 30, // seconds
      retryBackoff: true,
      archiveCompletedAfterSeconds: 60 * 60 * 24 * 7, // 7 days history
    });

    bossInstance.on('error', (err) => {
      console.error('pg-boss error:', err);
    });

    await bossInstance.start();
    console.log('⚡ pg-boss queue initialized and running');
  }

  return bossInstance;
}

export async function scheduleNotificationJob(
  reminderId: string,
  scheduledDate: Date
): Promise<string | null> {
  try {
    const boss = await getBoss();

    // If the reminder date is in the past or immediately due, schedule with immediate execution
    const now = new Date();
    const startAfter = scheduledDate > now ? scheduledDate : undefined;

    const jobId = await boss.send(
      REMINDER_QUEUE,
      { reminderId },
      {
        startAfter,
        singletonKey: `reminder-${reminderId}`, // Idempotency: prevents duplicate queue entries
      }
    );

    return jobId;
  } catch (err) {
    console.error('Failed to schedule notification job with pg-boss:', err);
    return null;
  }
}

export async function cancelNotificationJob(jobId: string): Promise<void> {
  try {
    const boss = await getBoss();
    await boss.cancel(REMINDER_QUEUE, jobId);
  } catch (err) {
    // If job already finished or doesn't exist, ignore
    console.warn(`Could not cancel job ${jobId}:`, err);
  }
}
