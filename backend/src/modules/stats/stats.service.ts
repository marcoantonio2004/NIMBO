import { prisma } from '../../db/prisma';

export class StatsService {
  static async getDashboardMetrics(userId: string, todayDateStr: string) {
    const now = new Date();

    const [
      totalCount,
      completedCount,
      highPriorityCount,
      todayCount,
      overdueCount,
      categoriesWithCounts,
      upcomingReminders,
    ] = await Promise.all([
      // Total reminders count
      prisma.reminder.count({ where: { userId } }),

      // Completed reminders count
      prisma.reminder.count({ where: { userId, status: 'COMPLETED' } }),

      // High priority active
      prisma.reminder.count({
        where: {
          userId,
          priority: 'HIGH',
          status: { not: 'COMPLETED' },
        },
      }),

      // Scheduled for today (active)
      prisma.reminder.count({
        where: {
          userId,
          date: todayDateStr,
          status: { not: 'COMPLETED' },
        },
      }),

      // Overdue (active and scheduledAt < now)
      prisma.reminder.count({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          scheduledAt: { lt: now },
        },
      }),

      // Distribution by category
      prisma.category.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          color: true,
          _count: {
            select: { reminders: true },
          },
        },
      }),

      // Next 5 upcoming active reminders
      prisma.reminder.findMany({
        where: {
          userId,
          status: { not: 'COMPLETED' },
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        include: { category: true },
      }),
    ]);

    const pendingCount = totalCount - completedCount;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      total: totalCount,
      pending: pendingCount,
      today: todayCount,
      done: completedCount,
      highPriority: highPriorityCount,
      overdue: overdueCount,
      completionRate,
      categories: categoriesWithCounts.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        count: c._count.reminders,
      })),
      upcoming: upcomingReminders,
    };
  }
}
