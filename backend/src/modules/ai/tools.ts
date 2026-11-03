import { RemindersService } from '../reminders/reminders.service';
import { prisma } from '../../db/prisma';
import { Priority, RecurrenceType } from '@prisma/client';

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  message: string;
  data?: unknown;
}

export const AI_TOOLS_DECLARATIONS = [
  {
    name: 'crear_recordatorio',
    description: 'Crea un nuevo recordatorio o actividad para el usuario en la base de datos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Título claro y descriptivo del recordatorio' },
        description: { type: 'STRING', description: 'Detalles o notas adicionales opcionales' },
        date: { type: 'STRING', description: 'Fecha en formato YYYY-MM-DD' },
        time: { type: 'STRING', description: 'Hora en formato HH:mm (24 horas)' },
        priority: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'Prioridad: LOW (baja), MEDIUM (media), HIGH (alta)' },
        categoryName: { type: 'STRING', description: 'Nombre de la categoría (ej. Personal, Trabajo, Salud, Estudio, Finanzas, Familia, Otros)' },
        recurrence: { type: 'STRING', enum: ['NONE', 'DAILY', 'WEEKDAYS', 'WEEKLY', 'MONTHLY', 'YEARLY'], description: 'Frecuencia de recurrencia' },
      },
      required: ['title', 'date', 'time'],
    },
  },
  {
    name: 'consultar_recordatorios',
    description: 'Consulta los recordatorios y pendientes del usuario desde la base de datos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'Fecha específica a consultar (YYYY-MM-DD)' },
        dateFrom: { type: 'STRING', description: 'Fecha inicial para un rango (YYYY-MM-DD)' },
        dateTo: { type: 'STRING', description: 'Fecha final para un rango (YYYY-MM-DD)' },
        status: { type: 'STRING', enum: ['all', 'active', 'PENDING', 'COMPLETED', 'OVERDUE'], description: 'Filtrar por estado' },
        search: { type: 'STRING', description: 'Palabra clave a buscar en el título o notas' },
        categoryName: { type: 'STRING', description: 'Nombre de la categoría para filtrar' },
      },
    },
  },
  {
    name: 'completar_recordatorio',
    description: 'Marca un recordatorio existente como completado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reminderId: { type: 'STRING', description: 'ID del recordatorio si se conoce' },
        titleSearch: { type: 'STRING', description: 'Texto o título del recordatorio para buscarlo si no se tiene el ID' },
      },
    },
  },
  {
    name: 'posponer_recordatorio',
    description: 'Pospone un recordatorio una cantidad de minutos o para una fecha/hora específica.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reminderId: { type: 'STRING', description: 'ID del recordatorio' },
        titleSearch: { type: 'STRING', description: 'Texto del recordatorio a posponer' },
        minutes: { type: 'NUMBER', description: 'Minutos a sumar (ej. 60 para 1 hora)' },
        untilDate: { type: 'STRING', description: 'Nueva fecha (YYYY-MM-DD)' },
        untilTime: { type: 'STRING', description: 'Nueva hora (HH:mm)' },
      },
    },
  },
  {
    name: 'eliminar_recordatorio',
    description: 'Elimina un recordatorio de la base de datos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reminderId: { type: 'STRING', description: 'ID del recordatorio' },
        titleSearch: { type: 'STRING', description: 'Texto para buscar el recordatorio a eliminar' },
      },
    },
  },
];

export async function executeAITool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'crear_recordatorio': {
        const title = String(args.title || '').trim();
        const date = String(args.date || '');
        const time = String(args.time || '09:00');
        const description = args.description ? String(args.description).trim() : undefined;
        const priority = (args.priority as Priority) || 'MEDIUM';
        const recurrence = (args.recurrence as RecurrenceType) || 'NONE';

        let categoryId: string | undefined;
        if (args.categoryName) {
          const cat = await prisma.category.findFirst({
            where: {
              userId,
              name: { equals: String(args.categoryName).trim(), mode: 'insensitive' },
            },
          });
          if (cat) categoryId = cat.id;
        }

        const reminder = await RemindersService.create(userId, {
          title,
          description,
          date,
          time,
          priority,
          categoryId,
          recurrence,
        });

        return {
          tool: toolName,
          success: true,
          message: `Recordatorio "${reminder.title}" programado para el ${reminder.date} a las ${reminder.time}.`,
          data: reminder,
        };
      }

      case 'consultar_recordatorios': {
        let categoryId: string | undefined;
        if (args.categoryName) {
          const cat = await prisma.category.findFirst({
            where: {
              userId,
              name: { equals: String(args.categoryName).trim(), mode: 'insensitive' },
            },
          });
          if (cat) categoryId = cat.id;
        }

        const filterStatus = args.status === 'all' ? undefined : (args.status as any) || 'active';

        const list = await RemindersService.list(userId, {
          date: args.date as string,
          dateFrom: args.dateFrom as string,
          dateTo: args.dateTo as string,
          status: filterStatus,
          search: args.search as string,
          categoryId,
        });

        return {
          tool: toolName,
          success: true,
          message: `Se encontraron ${list.length} recordatorio(s).`,
          data: list.map((r) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            time: r.time,
            priority: r.priority,
            status: r.status,
            category: r.category?.name,
            recurrence: r.recurrence,
          })),
        };
      }

      case 'completar_recordatorio': {
        let targetId = args.reminderId as string;
        if (!targetId && args.titleSearch) {
          const search = String(args.titleSearch).trim();
          const match = await prisma.reminder.findFirst({
            where: {
              userId,
              title: { contains: search, mode: 'insensitive' },
              status: { not: 'COMPLETED' },
            },
            orderBy: { scheduledAt: 'asc' },
          });
          if (match) targetId = match.id;
        }

        if (!targetId) {
          return {
            tool: toolName,
            success: false,
            message: 'No encontré ningún recordatorio pendiente que coincida con esa descripción.',
          };
        }

        const result = await RemindersService.toggleComplete(userId, targetId);
        return {
          tool: toolName,
          success: true,
          message: `El recordatorio "${result.completed?.title}" ha sido marcado como completado.`,
          data: result,
        };
      }

      case 'posponer_recordatorio': {
        let targetId = args.reminderId as string;
        if (!targetId && args.titleSearch) {
          const search = String(args.titleSearch).trim();
          const match = await prisma.reminder.findFirst({
            where: {
              userId,
              title: { contains: search, mode: 'insensitive' },
              status: { not: 'COMPLETED' },
            },
            orderBy: { scheduledAt: 'asc' },
          });
          if (match) targetId = match.id;
        }

        if (!targetId) {
          return {
            tool: toolName,
            success: false,
            message: 'No encontré ningún recordatorio pendiente que coincida para posponer.',
          };
        }

        const minutes = typeof args.minutes === 'number' ? args.minutes : undefined;
        const updated = await RemindersService.snooze(userId, targetId, {
          minutes,
          untilDate: args.untilDate as string,
          untilTime: args.untilTime as string,
        });

        return {
          tool: toolName,
          success: true,
          message: `Recordatorio "${updated.title}" pospuesto para el ${updated.date} a las ${updated.time}.`,
          data: updated,
        };
      }

      case 'eliminar_recordatorio': {
        let targetId = args.reminderId as string;
        if (!targetId && args.titleSearch) {
          const search = String(args.titleSearch).trim();
          const match = await prisma.reminder.findFirst({
            where: {
              userId,
              title: { contains: search, mode: 'insensitive' },
            },
            orderBy: { scheduledAt: 'asc' },
          });
          if (match) targetId = match.id;
        }

        if (!targetId) {
          return {
            tool: toolName,
            success: false,
            message: 'No encontré ningún recordatorio que coincida para eliminar.',
          };
        }

        const res = await RemindersService.delete(userId, targetId);
        return {
          tool: toolName,
          success: true,
          message: 'Recordatorio eliminado exitosamente.',
          data: res,
        };
      }

      default:
        return {
          tool: toolName,
          success: false,
          message: `Herramienta desconocida: ${toolName}`,
        };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      tool: toolName,
      success: false,
      message: `Error ejecutando ${toolName}: ${msg}`,
    };
  }
}
