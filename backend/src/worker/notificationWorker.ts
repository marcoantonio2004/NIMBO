import { getBoss, REMINDER_QUEUE, scheduleNotificationJob } from './boss';
import { prisma } from '../db/prisma';
import { PushService } from '../modules/push/push.service';
import { getNextRecurrenceDate, calculateScheduledTimestamp } from '../utils/time';

async function startNotificationWorker() {
  console.log('🚀 Iniciando NIMBO Notification Worker...');

  const boss = await getBoss();

  await boss.work<{ reminderId: string }>(REMINDER_QUEUE, async (jobs) => {
    // Process jobs in batch or one by one
    for (const job of jobs) {
      const { reminderId } = job.data;
      console.log(`[Worker] Procesando recordatorio ID: ${reminderId}`);

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

        // Send Push Notification
        const categoryName = reminder.category?.name ? ` [${reminder.category.name}]` : '';
        const priorityIcon = reminder.priority === 'HIGH' ? '🚨 ' : reminder.priority === 'MEDIUM' ? '🔔 ' : '📋 ';

        const payload = {
          title: `${priorityIcon}Recordatorio: ${reminder.title}`,
          body: reminder.description || `Actividad programada para hoy a las ${reminder.time}${categoryName}`,
          url: `/reminders?id=${reminder.id}`,
          tag: `reminder-${reminder.id}`,
          data: {
            reminderId: reminder.id,
            date: reminder.date,
            time: reminder.time,
          },
        };

        const result = await PushService.sendNotificationToUser(
          reminder.userId,
          payload,
          reminder.id
        );

        console.log(
          `[Worker] Notificación enviada para ${reminder.title}: ${result.sent} enviados, ${result.failed} fallidos.`
        );

        // If recurring and not completed, create next recurrence automatically
        if (reminder.recurrence && reminder.recurrence !== 'NONE') {
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

          console.log(`[Worker] Programando siguiente recurrencia (${reminder.recurrence}) para el ${nextDate}`);

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

          // Schedule next job in pg-boss
          const nextJobId = await scheduleNotificationJob(nextReminder.id, nextScheduledAt);
          if (nextJobId) {
            await prisma.reminder.update({
              where: { id: nextReminder.id },
              data: { bossJobId: nextJobId },
            });
          }
        }
      } catch (err) {
        console.error(`[Worker] Error procesando recordatorio ${reminderId}:`, err);
        throw err; // Allow pg-boss to retry according to retry policy
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

if (process.env.NODE_ENV !== 'test') {
  startNotificationWorker().catch((err) => {
    console.error('Fallo crítico al iniciar el Notification Worker:', err);
    process.exit(1);
  });
}
