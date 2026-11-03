import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { executeAITool } from './tools';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export class AIService {
  private static geminiClient: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI | null {
    if (!this.geminiClient && env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    return this.geminiClient;
  }

  static async processChat(
    userId: string,
    userMessage: string,
    history: ChatMessage[] = []
  ): Promise<{ response: string; toolExecuted?: string; toolResult?: unknown }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const timezone = user?.timezone || 'America/Mexico_City';

    const now = new Date();
    const currentDateStr = now.toLocaleDateString('es-MX', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    // Format YYYY-MM-DD
    const [d, m, y] = currentDateStr.split('/');
    const todayFormatted = `${y}-${m}-${d}`;
    const currentTimeFormatted = now.toLocaleTimeString('es-MX', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const client = this.getClient();

    if (client && env.GEMINI_API_KEY) {
      try {
        const systemInstruction = `Eres NIMBO, el asistente personal inteligente del usuario.
Lema: "Organiza tu tiempo. No olvides lo importante."
Idioma: Español.
Hoy es ${todayFormatted} y la hora actual es ${currentTimeFormatted} en la zona horaria ${timezone}.
Tu objetivo es comprender el lenguaje natural del usuario y ejecutar acciones reales en el sistema utilizando las herramientas disponibles.
- Si el usuario te pide recordar algo, usa 'crear_recordatorio'.
- Si pregunta qué pendientes tiene o qué actividades tiene hoy/semana, usa 'consultar_recordatorios'.
- Si pide marcar como lista o completar una tarea, usa 'completar_recordatorio'.
- Si pide posponer, usa 'posponer_recordatorio'.
- Si pide borrar o eliminar, usa 'eliminar_recordatorio'.
- Si falta información crítica (como el título o cuándo), pide amablemente la información necesaria.
- Sé conciso, profesional, elegante y confirma siempre las operaciones de manera clara.
- Nunca inventes que una actividad fue registrada si no ejecutaste la herramienta correspondiente.`;

        // Using Gemini model
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: userMessage }] },
          ],
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        const text = response.text || 'Entendido. ¿Deseas que agregue algo más?';
        return { response: text };
      } catch (err) {
        console.warn('Gemini API call returned error, falling back to rule engine:', err);
      }
    }

    // Built-in Deterministic Natural Language Engine (works offline or without API key)
    return this.fallbackRuleEngine(userId, userMessage, todayFormatted, currentTimeFormatted);
  }

  private static async fallbackRuleEngine(
    userId: string,
    message: string,
    today: string,
    timeNow: string
  ): Promise<{ response: string; toolExecuted?: string; toolResult?: unknown }> {
    const text = message.trim().toLowerCase();

    // 1. Consultar pendientes / qué tengo
    if (
      text.includes('qué tengo') ||
      text.includes('que tengo') ||
      text.includes('pendientes') ||
      text.includes('actividades') ||
      text.includes('agenda')
    ) {
      const isToday = text.includes('hoy');
      const isWeek = text.includes('semana');

      const toolArgs = isToday ? { date: today, status: 'active' } : { status: 'active' };
      const result = await executeAITool(userId, 'consultar_recordatorios', toolArgs);

      const items = (result.data as Array<{ title: string; date: string; time: string; priority: string }>) || [];
      if (items.length === 0) {
        return {
          response: isToday
            ? '¡Buenas noticias! No tienes recordatorios pendientes programados para hoy.'
            : 'No tienes recordatorios pendientes registrados en este momento.',
          toolExecuted: 'consultar_recordatorios',
          toolResult: result,
        };
      }

      const listStr = items
        .slice(0, 5)
        .map((i) => `• **${i.title}** (${i.date} a las ${i.time}) [${i.priority}]`)
        .join('\n');

      return {
        response: `Tienes ${items.length} actividad(es) pendiente(s):\n\n${listStr}${items.length > 5 ? '\n... y más en tu lista de recordatorios.' : ''}`,
        toolExecuted: 'consultar_recordatorios',
        toolResult: result,
      };
    }

    // 2. Completar actividad
    if (
      text.includes('completa') ||
      text.includes('marca como completad') ||
      text.includes('marcar como completad') ||
      text.includes('terminé') ||
      text.includes('termine') ||
      text.includes('ya hice')
    ) {
      const cleaned = message
        .replace(/^(marca como completada|marca como completado|completar|completa|ya hice|ya terminé)\s*/i, '')
        .replace(/(mi actividad|la actividad|mi tarea|el recordatorio)\s*/i, '')
        .trim();

      const result = await executeAITool(userId, 'completar_recordatorio', { titleSearch: cleaned });
      return {
        response: result.message,
        toolExecuted: 'completar_recordatorio',
        toolResult: result,
      };
    }

    // 3. Posponer
    if (text.includes('pospón') || text.includes('pospon') || text.includes('posterga')) {
      let minutes = 60; // default 1 hour
      if (text.includes('media hora') || text.includes('30 min')) minutes = 30;
      if (text.includes('15 min')) minutes = 15;
      if (text.includes('2 horas') || text.includes('dos horas')) minutes = 120;

      const cleaned = message
        .replace(/^(pospón|pospon|posterga)\s*/i, '')
        .replace(/(una hora|dos horas|media hora|\d+\s*(?:minutos|min|horas|hora))\s*/i, '')
        .replace(/(mi reunión|mi recordatorio|la actividad|mi tarea)\s*/i, '')
        .trim();

      const result = await executeAITool(userId, 'posponer_recordatorio', {
        titleSearch: cleaned,
        minutes,
      });

      return {
        response: result.message,
        toolExecuted: 'posponer_recordatorio',
        toolResult: result,
      };
    }

    // 4. Crear recordatorio (e.g. "Recuérdame...", "Agrega...", "Anotar...")
    if (
      text.includes('recuérdame') ||
      text.includes('recuerdame') ||
      text.includes('agregar recordatorio') ||
      text.includes('anota') ||
      text.includes('anotar') ||
      text.includes('crear recordatorio')
    ) {
      let cleanInput = message
        .replace(/^(recuérdame|recuerdame|anota|anotar|agrega|agregar recordatorio)\s*(que|a|de)?\s*/i, '')
        .trim();

      // Date parsing
      let targetDate = today;
      if (text.includes('mañana')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        targetDate = d.toISOString().split('T')[0];
        cleanInput = cleanInput.replace(/\bmañana\b/gi, ' ');
      } else if (text.includes('pasado mañana')) {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        targetDate = d.toISOString().split('T')[0];
        cleanInput = cleanInput.replace(/\bpasado mañana\b/gi, ' ');
      }

      // Time parsing
      let targetTime = '09:00';
      const timeMatch = cleanInput.match(/\b(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la mañana|de la tarde|de la noche)?\b/i);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = (timeMatch[3] || '').toLowerCase();

        if ((period.includes('pm') || period.includes('tarde') || period.includes('noche')) && h < 12) {
          h += 12;
        }
        if ((period.includes('am') || period.includes('mañana')) && h === 12) {
          h = 0;
        }

        targetTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        cleanInput = cleanInput.replace(timeMatch[0], ' ');
      }

      // Recurrence
      let recurrence = 'NONE';
      if (text.includes('cada mes') || text.includes('todos los meses') || text.includes('mensual')) {
        recurrence = 'MONTHLY';
      } else if (text.includes('cada día') || text.includes('todos los días') || text.includes('diario')) {
        recurrence = 'DAILY';
      } else if (text.includes('cada semana') || text.includes('semanal')) {
        recurrence = 'WEEKLY';
      }

      // Priority
      let priority = 'MEDIUM';
      if (text.includes('urgente') || text.includes('alta prioridad') || text.includes('importante')) {
        priority = 'HIGH';
      } else if (text.includes('baja prioridad')) {
        priority = 'LOW';
      }

      const finalTitle = cleanInput.replace(/\s+/g, ' ').replace(/^[,.\s-]+|[,.\s-]+$/g, '').trim();

      if (!finalTitle) {
        return {
          response: '¿Qué es lo que necesitas que recuerde? Por favor indícame la actividad.',
        };
      }

      const result = await executeAITool(userId, 'crear_recordatorio', {
        title: finalTitle,
        date: targetDate,
        time: targetTime,
        priority,
        recurrence,
      });

      return {
        response: `¡Listo! He registrado tu recordatorio: **"${finalTitle}"** para el ${targetDate} a las ${targetTime}${recurrence !== 'NONE' ? ' (Recurrente: ' + recurrence + ')' : ''}.`,
        toolExecuted: 'crear_recordatorio',
        toolResult: result,
      };
    }

    return {
      response: `He recibido tu mensaje: "${message}". Puedes pedirme registrar un recordatorio (ej. "Recuérdame mañana a las 8am llamar al hospital"), consultar tus actividades pendientes ("¿Qué tengo hoy?"), posponer tareas o marcar actividades como completadas.`,
    };
  }

  static async getDailyGreeting(userId: string): Promise<{
    greeting: string;
    todayEvents: Array<{ id: string; title: string; time: string; priority: string }>;
    overdueEventsCount: number;
    totalPendingCount: number;
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const timezone = user?.timezone || 'America/Mexico_City';
    const userName = user?.name ? user.name.split(' ')[0] : 'Propietario';

    const now = new Date();
    const currentDateStr = now.toLocaleDateString('es-MX', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [d, m, y] = currentDateStr.split('/');
    const todayFormatted = `${y}-${m}-${d}`;

    const hour = parseInt(
      now.toLocaleTimeString('es-MX', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false,
      }),
      10
    );

    const timeGreeting =
      hour < 12 ? '¡Buenos días' : hour < 19 ? '¡Buenas tardes' : '¡Buenas noches';

    // Query today's active reminders
    const todayReminders = await prisma.reminder.findMany({
      where: {
        userId,
        date: todayFormatted,
        status: { in: ['PENDING', 'SNOOZED', 'OVERDUE'] },
      },
      orderBy: { time: 'asc' },
    });

    // Query overdue reminders before today
    const overdueReminders = await prisma.reminder.findMany({
      where: {
        userId,
        date: { lt: todayFormatted },
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    });

    // Query total pending
    const totalPending = await prisma.reminder.count({
      where: {
        userId,
        status: { in: ['PENDING', 'SNOOZED', 'OVERDUE'] },
      },
    });

    // Format human-friendly proactive greeting text
    let message = `${timeGreeting}, ${userName}! `;

    if (todayReminders.length === 0) {
      message += `Hoy no tienes actividades pendientes programadas, tu agenda está libre. ✨\n\n`;
    } else if (todayReminders.length === 1) {
      const r = todayReminders[0];
      message += `Tienes 1 actividad programada para hoy:\n• ⏰ **${r.time}** — ${r.title}\n\n`;
    } else {
      message += `Tienes ${todayReminders.length} actividades programadas para hoy:\n`;
      todayReminders.forEach((r) => {
        message += `• ⏰ **${r.time}** — ${r.title}\n`;
      });
      message += `\n`;
    }

    if (overdueReminders.length > 0) {
      message += `⚠️ Tienes ${overdueReminders.length} pendiente${
        overdueReminders.length > 1 ? 's' : ''
      } atrasado${overdueReminders.length > 1 ? 's' : ''} de días anteriores.\n\n`;
    }

    message += `¿En qué te puedo ayudar hoy? Puedes pedirme agregar una nueva actividad, consultar tu semana o posponer alguna cita.`;

    return {
      greeting: message,
      todayEvents: todayReminders.map((r) => ({
        id: r.id,
        title: r.title,
        time: r.time,
        priority: r.priority,
      })),
      overdueEventsCount: overdueReminders.length,
      totalPendingCount: totalPending,
    };
  }
}
