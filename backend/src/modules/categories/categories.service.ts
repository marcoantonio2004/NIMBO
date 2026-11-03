import { prisma } from '../../db/prisma';

export class CategoriesService {
  static async list(userId: string) {
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            reminders: {
              where: { status: { not: 'COMPLETED' } },
            },
          },
        },
      },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      isDefault: c.isDefault,
      activeRemindersCount: c._count.reminders,
    }));
  }

  static async create(userId: string, data: { name: string; color: string; icon?: string }) {
    const existing = await prisma.category.findUnique({
      where: {
        userId_name: {
          userId,
          name: data.name,
        },
      },
    });

    if (existing) {
      const err = new Error(`Ya existe una categoría llamada "${data.name}".`);
      (err as unknown as { statusCode: number }).statusCode = 400;
      throw err;
    }

    return prisma.category.create({
      data: {
        userId,
        name: data.name,
        color: data.color,
        icon: data.icon,
        isDefault: false,
      },
    });
  }

  static async update(
    userId: string,
    id: string,
    data: { name?: string; color?: string; icon?: string }
  ) {
    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      const err = new Error('Categoría no encontrada.');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    return prisma.category.update({
      where: { id },
      data,
    });
  }

  static async delete(userId: string, id: string) {
    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      const err = new Error('Categoría no encontrada.');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    // Reminders associated will have categoryId set to NULL via Prisma onDelete: SetNull
    await prisma.category.delete({
      where: { id },
    });

    return { success: true, message: 'Categoría eliminada correctamente.' };
  }
}
