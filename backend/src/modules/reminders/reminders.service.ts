import { prisma } from '../../db/prisma';
import { ReminderStatus, Priority, RecurrenceType } from '@prisma/client';
import { calculateScheduledTimestamp, getNextRecurrenceDate } from '../../utils/time';
import {
  scheduleReminderMilestones,
  scheduleNotificationJob,
  cancelNotificationJobs,
} from '../../worker/boss';

export interface ListRemindersFilter {
  status?: ReminderStatus | 'active';
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  priority?: Priority;
  search?: string;
}

export class RemindersService {
  static async create(
    userId: string,
    data: {
      title: string;
      description?: string;
      date: string;
      time: string;
      priority?: Priority;
      categoryId?: string | null;
      recurrence?: RecurrenceType;
      recurrenceInterval?: number | null;
      advanceMinutes?: number;
      tags?: string[];
    }
  ) {
    const scheduledAt = calculateScheduledTimestamp(
      data.date,
      data.time,
      data.advanceMinutes || 0
    );

    const reminder = await prisma.reminder.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        date: data.date,
        time: data.time,
        scheduledAt,
        priority: data.priority || 'MEDIUM',
        status: 'PENDING',
        categoryId: data.categoryId || null,
        recurrence: data.recurrence || 'NONE',
        recurrenceInterval: data.recurrenceInterval || null,
        advanceMinutes: data.advanceMinutes || 0,
        tags: data.tags || [],
      },
      include: {
        category: true,
      },
    });

    // Schedule background notification jobs for all milestones:
    // 1 day before, 1 hour before, 10 min before, exact time
    const jobIds = await scheduleReminderMilestones({
      id: reminder.id,
      title: reminder.title,
      date: reminder.date,
      time: reminder.time,
      advanceMinutes: reminder.advanceMinutes,
    });

    if (jobIds.length > 0) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { bossJobId: jobIds.join(',') },
      });
      reminder.bossJobId = jobIds.join(',');
    }

    return reminder;
  }

  static async list(userId: string, filter: ListRemindersFilter = {}) {
    const where: Record<string, unknown> = { userId };

    if (filter.status) {
      if (filter.status === 'active') {
        where.status = { not: 'COMPLETED' };
      } else {
        where.status = filter.status;
      }
    }

    if (filter.date) {
      where.date = filter.date;
    } else if (filter.dateFrom || filter.dateTo) {
      const dateFilter: Record<string, string> = {};
      if (filter.dateFrom) dateFilter.gte = filter.dateFrom;
      if (filter.dateTo) dateFilter.lte = filter.dateTo;
      where.date = dateFilter;
    }

    if (filter.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q.toLowerCase() } },
      ];
    }

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: [
        { scheduledAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        category: true,
      },
    });

    // Auto-detect overdue reminders in real-time
    const now = new Date();
    const updated = await Promise.all(
      reminders.map(async (r) => {
        if (
          r.status === 'PENDING' &&
          r.scheduledAt < now
        ) {
          // Update status in DB in background
          prisma.reminder
            .update({
              where: { id: r.id },
              data: { status: 'OVERDUE' },
            })
            .catch(() => {});
          return { ...r, status: 'OVERDUE' as ReminderStatus };
        }
        return r;
      })
    );

    return updated;
  }

  static async getById(userId: string, id: string) {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!reminder) {
      const err = new Error('Recordatorio no encontrado.');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    return reminder;
  }

  static async update(
    userId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      date?: string;
      time?: string;
      priority?: Priority;
      status?: ReminderStatus;
      categoryId?: string | null;
      recurrence?: RecurrenceType;
      recurrenceInterval?: number | null;
      advanceMinutes?: number;
      tags?: string[];
    }
  ) {
    const existing = await this.getById(userId, id);

    let newScheduledAt = existing.scheduledAt;
    const dateChanged = data.date && data.date !== existing.date;
    const timeChanged = data.time && data.time !== existing.time;
    const advanceChanged = data.advanceMinutes !== undefined && data.advanceMinutes !== existing.advanceMinutes;

    if (dateChanged || timeChanged || advanceChanged) {
      const targetDate = data.date || existing.date;
      const targetTime = data.time || existing.time;
      const targetAdvance = data.advanceMinutes !== undefined ? data.advanceMinutes : existing.advanceMinutes;

      newScheduledAt = calculateScheduledTimestamp(targetDate, targetTime, targetAdvance);

      // Cancel old pg-boss jobs
      if (existing.bossJobId) {
        await cancelNotificationJobs(existing.bossJobId);
      }
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        ...data,
        scheduledAt: newScheduledAt,
      },
      include: { category: true },
    });

    // If scheduledAt or title changed and reminder is still active, schedule milestone jobs
    if ((dateChanged || timeChanged || advanceChanged) && updated.status !== 'COMPLETED') {
      const jobIds = await scheduleReminderMilestones({
        id: updated.id,
        title: updated.title,
        date: updated.date,
        time: updated.time,
        advanceMinutes: updated.advanceMinutes,
      });
      if (jobIds.length > 0) {
        const joined = jobIds.join(',');
        await prisma.reminder.update({
          where: { id },
          data: { bossJobId: joined },
        });
        updated.bossJobId = joined;
      }
    }

    return updated;
  }

  static async delete(userId: string, id: string) {
    const existing = await this.getById(userId, id);

    if (existing.bossJobId) {
      await cancelNotificationJobs(existing.bossJobId);
    }

    await prisma.reminder.delete({
      where: { id },
    });

    return { success: true, message: 'Recordatorio eliminado correctamente.' };
  }

  static async toggleComplete(userId: string, id: string) {
    const existing = await this.getById(userId, id);
    const nextDone = existing.status !== 'COMPLETED';

    if (nextDone) {
      // Complete reminder
      if (existing.bossJobId) {
        await cancelNotificationJobs(existing.bossJobId);
      }

      const completed = await prisma.reminder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          bossJobId: null,
        },
        include: { category: true },
      });

      // Handle recurrence creation if recurring
      let nextOccurrence = null;
      if (existing.recurrence && existing.recurrence !== 'NONE') {
        const nextDate = getNextRecurrenceDate(
          existing.date,
          existing.recurrence,
          existing.recurrenceInterval || 1
        );

        const nextScheduledAt = calculateScheduledTimestamp(
          nextDate,
          existing.time,
          existing.advanceMinutes
        );

        nextOccurrence = await prisma.reminder.create({
          data: {
            userId,
            categoryId: existing.categoryId,
            title: existing.title,
            description: existing.description,
            date: nextDate,
            time: existing.time,
            scheduledAt: nextScheduledAt,
            priority: existing.priority,
            status: 'PENDING',
            recurrence: existing.recurrence,
            recurrenceInterval: existing.recurrenceInterval,
            advanceMinutes: existing.advanceMinutes,
            tags: existing.tags,
          },
          include: { category: true },
        });

        const nextJobIds = await scheduleReminderMilestones({
          id: nextOccurrence.id,
          title: nextOccurrence.title,
          date: nextOccurrence.date,
          time: nextOccurrence.time,
          advanceMinutes: nextOccurrence.advanceMinutes,
        });

        if (nextJobIds.length > 0) {
          await prisma.reminder.update({
            where: { id: nextOccurrence.id },
            data: { bossJobId: nextJobIds.join(',') },
          });
        }
      }

      return { completed, nextOccurrence };
    } else {
      // Reactivate reminder
      const scheduledAt = calculateScheduledTimestamp(
        existing.date,
        existing.time,
        existing.advanceMinutes
      );

      const reactivated = await prisma.reminder.update({
        where: { id },
        data: {
          status: 'PENDING',
          completedAt: null,
          scheduledAt,
        },
        include: { category: true },
      });

      const jobIds = await scheduleReminderMilestones({
        id: reactivated.id,
        title: reactivated.title,
        date: reactivated.date,
        time: reactivated.time,
        advanceMinutes: reactivated.advanceMinutes,
      });

      if (jobIds.length > 0) {
        const joined = jobIds.join(',');
        await prisma.reminder.update({
          where: { id },
          data: { bossJobId: joined },
        });
        reactivated.bossJobId = joined;
      }

      return { reactivated, nextOccurrence: null };
    }
  }

  static async snooze(
    userId: string,
    id: string,
    options: { minutes?: number; untilDate?: string; untilTime?: string }
  ) {
    const existing = await this.getById(userId, id);

    let targetDate = existing.date;
    let targetTime = existing.time;

    if (options.untilDate && options.untilTime) {
      targetDate = options.untilDate;
      targetTime = options.untilTime;
    } else {
      const minutesToAdd = options.minutes || 15;
      const [y, m, d] = existing.date.split('-').map(Number);
      const [h, min] = existing.time.split(':').map(Number);
      const tempDate = new Date(y, m - 1, d, h, min + minutesToAdd);

      const nY = tempDate.getFullYear();
      const nM = String(tempDate.getMonth() + 1).padStart(2, '0');
      const nD = String(tempDate.getDate()).padStart(2, '0');
      const nH = String(tempDate.getHours()).padStart(2, '0');
      const nMin = String(tempDate.getMinutes()).padStart(2, '0');

      targetDate = `${nY}-${nM}-${nD}`;
      targetTime = `${nH}:${nMin}`;
    }

    const scheduledAt = calculateScheduledTimestamp(targetDate, targetTime, 0);

    if (existing.bossJobId) {
      await cancelNotificationJobs(existing.bossJobId);
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        date: targetDate,
        time: targetTime,
        scheduledAt,
        status: 'SNOOZED',
        snoozedUntil: scheduledAt,
      },
      include: { category: true },
    });

    const newJobId = await scheduleNotificationJob(updated.id, scheduledAt);
    if (newJobId) {
      await prisma.reminder.update({
        where: { id },
        data: { bossJobId: newJobId },
      });
      updated.bossJobId = newJobId;
    }

    return updated;
  }

  static async clearCompleted(userId: string) {
    const result = await prisma.reminder.deleteMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    return { count: result.count, message: `Se eliminaron ${result.count} recordatorios completados.` };
  }
}
