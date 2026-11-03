import PgBoss from 'pg-boss';
import { env } from '../config/env';
import { calculateScheduledTimestamp } from '../utils/time';

export const REMINDER_QUEUE = 'send-reminder-notification';

export type ReminderStage = '1_day' | '1_hour' | '10_min' | 'exact' | 'advance';

export interface ReminderNotificationJobData {
  reminderId: string;
  stage: ReminderStage;
  stageLabel: string;
  speechText: string;
}

let bossInstance: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (!bossInstance) {
    bossInstance = new PgBoss({
      connectionString: env.DATABASE_URL,
      retryLimit: 3,
      retryDelay: 30, // seconds
      retryBackoff: true,
      archiveCompletedAfterSeconds: 60 * 60 * 24 * 7, // 7 days history
    });

    bossInstance.on('error', (err) => {
      console.error('pg-boss error:', err);
    });

    await bossInstance.start();
    // Ensure queue exists in pg-boss v10
    await bossInstance.createQueue(REMINDER_QUEUE).catch(() => {});
    console.log('⚡ pg-boss queue initialized and running');
  }

  return bossInstance;
}

/**
 * Schedules all reminder notification milestones:
 * - 1 day before (1440 min)
 * - 1 hour before (60 min)
 * - 10 minutes before (10 min)
 * - Exact event time (0 min)
 * - Optional custom advance if configured
 *
 * Each milestone includes speech synthesis narration text in Spanish.
 */
export async function scheduleReminderMilestones(reminder: {
  id: string;
  title: string;
  date: string;
  time: string;
  advanceMinutes?: number;
}): Promise<string[]> {
  try {
    const boss = await getBoss();
    const now = Date.now();

    const milestoneConfigs: Array<{
      stage: ReminderStage;
      advanceMinutes: number;
      stageLabel: string;
      speechText: string;
    }> = [
      {
        stage: '1_day',
        advanceMinutes: 1440,
        stageLabel: 'Falta 1 día',
        speechText: `Atención. Falta un día para tu evento: ${reminder.title}.`,
      },
      {
        stage: '1_hour',
        advanceMinutes: 60,
        stageLabel: 'Falta 1 hora',
        speechText: `Atención. Falta una hora para: ${reminder.title}.`,
      },
      {
        stage: '10_min',
        advanceMinutes: 10,
        stageLabel: 'Faltan 10 minutos',
        speechText: `Atención. Faltan diez minutos para: ${reminder.title}.`,
      },
      {
        stage: 'exact',
        advanceMinutes: 0,
        stageLabel: 'Es momento de tu evento',
        speechText: `Es momento de tu actividad: ${reminder.title}.`,
      },
    ];

    // If custom advance was set and not one of the standard intervals, include it
    if (reminder.advanceMinutes && ![1440, 60, 10, 0].includes(reminder.advanceMinutes)) {
      milestoneConfigs.push({
        stage: 'advance',
        advanceMinutes: reminder.advanceMinutes,
        stageLabel: `Faltan ${reminder.advanceMinutes} minutos`,
        speechText: `Atención. Faltan ${reminder.advanceMinutes} minutos para: ${reminder.title}.`,
      });
    }

    const jobIds: string[] = [];

    for (const config of milestoneConfigs) {
      const targetDate = calculateScheduledTimestamp(
        reminder.date,
        reminder.time,
        config.advanceMinutes
      );
      const targetTime = targetDate.getTime();

      // Only schedule if this milestone is still in the future
      if (targetTime > now + 1000) {
        const jobId = await boss.send(
          REMINDER_QUEUE,
          {
            reminderId: reminder.id,
            stage: config.stage,
            stageLabel: config.stageLabel,
            speechText: config.speechText,
          },
          {
            startAfter: targetDate,
          }
        );

        if (jobId) {
          jobIds.push(jobId);
          console.log(
            `[pg-boss] Programado hito "${config.stageLabel}" para "${reminder.title}": ID ${jobId} (ejecución: ${targetDate.toISOString()})`
          );
        }
      }
    }

    // If all milestones are in the past (e.g. reminder created for immediate execution or testing),
    // schedule the exact event notification immediately.
    if (jobIds.length === 0) {
      const jobId = await boss.send(
        REMINDER_QUEUE,
        {
          reminderId: reminder.id,
          stage: 'exact',
          stageLabel: 'Es momento de tu evento',
          speechText: `Es momento de tu actividad: ${reminder.title}.`,
        }
      );
      if (jobId) {
        jobIds.push(jobId);
        console.log(`[pg-boss] Programado disparo inmediato para "${reminder.title}": ID ${jobId}`);
      }
    }

    return jobIds;
  } catch (err) {
    console.error('Failed to schedule reminder milestones with pg-boss:', err);
    return [];
  }
}

/**
 * Backward compatibility single-job scheduler.
 */
export async function scheduleNotificationJob(
  reminderId: string,
  scheduledDate: Date
): Promise<string | null> {
  try {
    const boss = await getBoss();
    const now = new Date();
    const startAfter = scheduledDate > now ? scheduledDate : undefined;

    const jobId = await boss.send(
      REMINDER_QUEUE,
      {
        reminderId,
        stage: 'exact',
        stageLabel: 'Es momento de tu evento',
        speechText: 'Tienes una actividad programada ahora.',
      },
      { startAfter }
    );

    return jobId;
  } catch (err) {
    console.error('Failed to schedule notification job with pg-boss:', err);
    return null;
  }
}

/**
 * Cancels all scheduled pg-boss jobs associated with a reminder.
 * Accepts a comma-separated list of job IDs or a single ID.
 */
export async function cancelNotificationJobs(jobIdsString?: string | null): Promise<void> {
  if (!jobIdsString) return;
  try {
    const boss = await getBoss();
    const ids = jobIdsString.split(',').map((s) => s.trim()).filter(Boolean);
    for (const id of ids) {
      await boss.cancel(REMINDER_QUEUE, id);
    }
  } catch (err) {
    console.warn(`Could not cancel jobs "${jobIdsString}":`, err);
  }
}

export const cancelNotificationJob = cancelNotificationJobs;
