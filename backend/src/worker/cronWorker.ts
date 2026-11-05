import { prisma } from '../db/prisma';
import { PushService } from '../modules/push/push.service';
import { calculateScheduledTimestamp, getNextRecurrenceDate } from '../utils/time';
import { scheduleReminderMilestones } from './boss';

export async function processCronNotifications(): Promise<{
  processed: number;
  sent: number;
  details: string[];
}> {
  const now = new Date();
  const nowTime = now.getTime();
  const details: string[] = [];
  let sentCount = 0;

  // Find all non-completed reminders
  const reminders = await prisma.reminder.findMany({
    where: {
      status: { in: ['PENDING', 'SNOOZED', 'OVERDUE'] },
    },
    include: {
      user: true,
      category: true,
      notificationLogs: true,
    },
  });

  for (const reminder of reminders) {
    const milestones: Array<{
      stage: '1_day' | '1_hour' | '10_min' | 'exact';
      advanceMinutes: number;
      label: string;
      speechText: string;
      iconPrefix: string;
    }> = [
      {
        stage: '1_day',
        advanceMinutes: 1440,
        label: 'Falta 1 día',
        speechText: `Atención. Falta un día para tu evento: ${reminder.title}.`,
        iconPrefix: '🚨 [1 día] ',
      },
      {
        stage: '1_hour',
        advanceMinutes: 60,
        label: 'Falta 1 hora',
        speechText: `Atención. Falta una hora para: ${reminder.title}.`,
        iconPrefix: '🔔 [1 hora] ',
      },
      {
        stage: '10_min',
        advanceMinutes: 10,
        label: 'Faltan 10 minutos',
        speechText: `Atención. Faltan diez minutos para: ${reminder.title}.`,
        iconPrefix: '⚡ [10 min] ',
      },
      {
        stage: 'exact',
        advanceMinutes: 0,
        label: 'Es momento de tu evento',
        speechText: `Es momento de tu actividad: ${reminder.title}.`,
        iconPrefix: '⏰ ',
      },
    ];

    for (const m of milestones) {
      const milestoneTarget = calculateScheduledTimestamp(
        reminder.date,
        reminder.time,
        m.advanceMinutes
      );
      const diffMs = Math.abs(nowTime - milestoneTarget.getTime());

      // If within 2 minutes of the target execution window
      if (diffMs <= 2 * 60 * 1000) {
        const tag = `reminder-${reminder.id}-${m.stage}`;

        // Check if already logged / dispatched to prevent duplicate sends
        const alreadySent = reminder.notificationLogs.some(
          (log) => log.title.includes(m.stage) || log.title.includes(m.label)
        );

        if (!alreadySent) {
          const payload = {
            title: `${m.iconPrefix}${reminder.title}`,
            body:
              reminder.description ||
              `${m.label}: ${reminder.title} a las ${reminder.time}`,
            url: `/reminders?id=${reminder.id}`,
            tag,
            speechText: m.speechText,
            data: {
              reminderId: reminder.id,
              date: reminder.date,
              time: reminder.time,
              stage: m.stage,
              speechText: m.speechText,
            },
          };

          const result = await PushService.sendNotificationToUser(
            reminder.userId,
            payload,
            reminder.id
          );

          if (result.sent > 0) {
            sentCount += result.sent;
            details.push(`[${m.stage}] Enviado para "${reminder.title}"`);
          }

          // Advance recurrence on exact time
          if (m.stage === 'exact' && reminder.recurrence && reminder.recurrence !== 'NONE') {
            const nextDate = getNextRecurrenceDate(
              reminder.date,
              reminder.recurrence,
              reminder.recurrenceInterval || 1
            );

            const nextScheduledAt = calculateScheduledTimestamp(
              nextDate,
              reminder.time,
              reminder.advanceMinutes
            );

            const nextReminder = await prisma.reminder.create({
              data: {
                userId: reminder.userId,
                categoryId: reminder.categoryId,
                title: reminder.title,
                description: reminder.description,
                date: nextDate,
                time: reminder.time,
                scheduledAt: nextScheduledAt,
                priority: reminder.priority,
                status: 'PENDING',
                recurrence: reminder.recurrence,
                recurrenceInterval: reminder.recurrenceInterval,
                advanceMinutes: reminder.advanceMinutes,
                tags: reminder.tags,
              },
            });

            await scheduleReminderMilestones({
              id: nextReminder.id,
              title: nextReminder.title,
              date: nextReminder.date,
              time: nextReminder.time,
              advanceMinutes: nextReminder.advanceMinutes,
            }).catch(() => {});
          }
        }
      }
    }
  }

  return {
    processed: reminders.length,
    sent: sentCount,
    details,
  };
}
