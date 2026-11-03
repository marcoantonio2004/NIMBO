import {
  getBoss,
  REMINDER_QUEUE,
  scheduleReminderMilestones,
  ReminderNotificationJobData,
} from './boss';
import { prisma } from '../db/prisma';
import { PushService } from '../modules/push/push.service';
import { getNextRecurrenceDate } from '../utils/time';

export async function startNotificationWorker() {
  console.log('🚀 Iniciando NIMBO Notification Worker...');

  const boss = await getBoss();

  await boss.work<ReminderNotificationJobData>(REMINDER_QUEUE, async (jobs) => {
    // Process jobs
    for (const job of jobs) {
      const {
        reminderId,
        stage = 'exact',
        stageLabel = '',
        speechText,
      } = job.data;

      console.log(`[Worker] Procesando hito [${stage}] para recordatorio ID: ${reminderId}`);

      try {
        const reminder = await prisma.reminder.findUnique({
          where: { id: reminderId },
          include: { user: true, category: true },
        });

        if (!reminder) {
          console.log(`[Worker] Recordatorio ${reminderId} no encontrado (probablemente eliminado).`);
          continue;
        }

        if (reminder.status === 'COMPLETED') {
          console.log(`[Worker] Recordatorio ${reminderId} ya fue completado. Omitiendo notificación.`);
          continue;
        }

        // Generate tailored speech text and title based on milestone
        const spokenMessage =
          speechText ||
          (stage === '1_day'
            ? `Atención. Falta un día para tu evento: ${reminder.title}.`
            : stage === '1_hour'
            ? `Atención. Falta una hora para tu evento: ${reminder.title}.`
            : stage === '10_min'
            ? `Atención. Faltan diez minutos para: ${reminder.title}.`
            : `Es momento de tu actividad: ${reminder.title}.`);

        const iconPrefix =
          stage === '1_day'
            ? '🚨 [1 día] '
            : stage === '1_hour'
            ? '🔔 [1 hora] '
            : stage === '10_min'
            ? '⚡ [10 min] '
            : '⏰ ';

        const payload = {
          title: `${iconPrefix}${reminder.title}`,
          body:
            reminder.description ||
            (stageLabel
              ? `${stageLabel}: ${reminder.title} a las ${reminder.time}`
              : `Actividad programada: ${reminder.title} (${reminder.time})`),
          url: `/reminders?id=${reminder.id}`,
          tag: `reminder-${reminder.id}-${stage}`,
          speechText: spokenMessage,
          data: {
            reminderId: reminder.id,
            date: reminder.date,
            time: reminder.time,
            stage,
            speechText: spokenMessage,
          },
        };

        const result = await PushService.sendNotificationToUser(
          reminder.userId,
          payload,
          reminder.id
        );

        console.log(
          `[Worker] Notificación de hito [${stage}] enviada para "${reminder.title}": ${result.sent} enviados, ${result.failed} fallidos.`
        );

        // Only on the final 'exact' milestone: if recurring, create next occurrence
        if (stage === 'exact' && reminder.recurrence && reminder.recurrence !== 'NONE') {
          const nextDate = getNextRecurrenceDate(
            reminder.date,
            reminder.recurrence,
            reminder.recurrenceInterval || 1
          );

          console.log(
            `[Worker] Programando siguiente recurrencia (${reminder.recurrence}) para el ${nextDate}`
          );

          const nextReminder = await prisma.reminder.create({
            data: {
              userId: reminder.userId,
              categoryId: reminder.categoryId,
              title: reminder.title,
              description: reminder.description,
              date: nextDate,
              time: reminder.time,
              scheduledAt: new Date(), // updated automatically by milestone scheduler
              priority: reminder.priority,
              status: 'PENDING',
              recurrence: reminder.recurrence,
              recurrenceInterval: reminder.recurrenceInterval,
              advanceMinutes: reminder.advanceMinutes,
              tags: reminder.tags,
            },
          });

          // Schedule milestone jobs in pg-boss
          const nextJobIds = await scheduleReminderMilestones({
            id: nextReminder.id,
            title: nextReminder.title,
            date: nextReminder.date,
            time: nextReminder.time,
            advanceMinutes: nextReminder.advanceMinutes,
          });

          if (nextJobIds.length > 0) {
            await prisma.reminder.update({
              where: { id: nextReminder.id },
              data: { bossJobId: nextJobIds.join(',') },
            });
          }
        }
      } catch (err) {
        console.error(`[Worker] Error procesando recordatorio ${reminderId}:`, err);
        throw err;
      }
    }
  });

  console.log('✅ NIMBO Notification Worker escuchando trabajos en pg-boss.');
}

// Graceful termination
const shutdown = async () => {
  console.log('Deteniendo Notification Worker...');
  try {
    const boss = await getBoss();
    await boss.stop();
    await prisma.$disconnect();
    console.log('Notification Worker detenido de forma segura.');
    process.exit(0);
  } catch (err) {
    console.error('Error durante el apagado del worker:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (process.env.NODE_ENV !== 'test' && process.argv[1]?.includes('notificationWorker')) {
  startNotificationWorker().catch((err) => {
    console.error('Fallo crítico al iniciar el Notification Worker:', err);
    process.exit(1);
  });
}
