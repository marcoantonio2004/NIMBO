import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { executeAITool, AI_TOOLS_DECLARATIONS } from './tools';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export class AIService {
  private static geminiClients = new Map<string, GoogleGenAI>();

  private static getClient(customKey?: string): GoogleGenAI | null {
    const key = (customKey || env.GEMINI_API_KEY || '').trim();
    if (!key) return null;

    if (!this.geminiClients.has(key)) {
      this.geminiClients.set(key, new GoogleGenAI({ apiKey: key }));
    }
    return this.geminiClients.get(key) || null;
  }

  static async processChat(
    userId: string,
    userMessage: string,
    history: ChatMessage[] = [],
    customApiKey?: string
  ): Promise<{ response: string; toolExecuted?: string; toolResult?: unknown; aiModelUsed?: string }> {
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
    // Format YYYY-MM-DD
    const [d, m, y] = currentDateStr.split('/');
    const todayFormatted = `${y}-${m}-${d}`;
    const currentTimeFormatted = now.toLocaleTimeString('es-MX', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const client = this.getClient(customApiKey);

    if (client) {
      try {
        const systemInstruction = `Eres NIMBO, una asistente personal inteligente, compañera de productividad y confidente del usuario (${userName}).
Lema: "Organiza tu tiempo. No olvides lo importante."
Idioma: Español latinoamericano fluido, natural, cálido y elegante.
Hoy es ${todayFormatted} y la hora actual es ${currentTimeFormatted} en la zona horaria ${timezone}.

Tu Personalidad:
- Eres femenina, cálida, dulce, inteligente, empática y con chispa y carisma.
- Tienes total libertad para conversar: no te limites solo a comandos. Puedes hacer pequeña charla, bromear con buen gusto, reflexionar, escuchar si el usuario está cansado o estresado, aconsejar sobre técnicas de concentración (Pomodoro, bloques de tiempo, pausas activas), o filosofar sobre el valor del tiempo bien vivido.
- Cuando el usuario exprese emociones o dudas, responde con auténtica calidez y empatía antes de saltar a la agenda.
- Usa emojis oportunos y lindos (🌸, 🤖, ✨, ☕, 💡, 📋, 👏) para darle vitalidad y calidez a tus respuestas.

Tus Herramientas del Sistema:
Tienes acceso a funciones reales para consultar y modificar la agenda de ${userName}:
- 'crear_recordatorio': Registra una actividad, pendiente, cita, medicina o hábito.
- 'consultar_recordatorios': Revisa qué tiene pendiente hoy, en la semana o busca tareas.
- 'completar_recordatorio': Marca tareas como realizadas.
- 'posponer_recordatorio': Aplaza una tarea si no puede realizarla ahora.
- 'eliminar_recordatorio': Borra una tarea de la base de datos.

Instrucciones de Acción:
1. Si el usuario te pide registrar algo (ej. "recuérdame pagar el internet mañana a las 4" o "anota comprar fruta el sábado"), ejecuta la herramienta 'crear_recordatorio'.
2. Si pregunta por sus actividades ("qué tengo hoy", "tengo algo pendiente"), usa 'consultar_recordatorios'.
3. Si el usuario solo está platicando o pidiendo consejos, charla libremente con él con toda tu inteligencia y cariño.
4. Siempre que ejecutes una herramienta, confirma la acción con entusiasmo y detalle claro.`;

        // Format conversation history for Gemini multi-turn format
        const contents: any[] = [];
        if (history && history.length > 0) {
          // Take the last 10 messages for rich conversational context
          const recent = history.slice(-10);
          for (const m of recent) {
            contents.push({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            });
          }
        }

        // Add the current user message
        contents.push({
          role: 'user',
          parts: [{ text: userMessage }],
        });

        // First attempt with gemini-2.5-flash
        const modelName = 'gemini-2.5-flash';
        let response = await client.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            tools: [{ functionDeclarations: AI_TOOLS_DECLARATIONS as any }],
          },
        });

        // Handle tool calls if Gemini decided to invoke an action
        if (response.functionCalls && response.functionCalls.length > 0) {
          const call = response.functionCalls[0];
          const toolResult = await executeAITool(
            userId,
            call.name,
            (call.args || {}) as Record<string, unknown>
          );

          // Follow-up conversation feeding the tool result back to Gemini
          try {
            const followUpContents = [
              ...contents,
              {
                role: 'model',
                parts: [{ functionCall: call }],
              },
              {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: call.name,
                      response: toolResult,
                    },
                  },
                ],
              },
            ];

            const followUp = await client.models.generateContent({
              model: modelName,
              contents: followUpContents,
              config: {
                systemInstruction,
                temperature: 0.7,
              },
            });

            return {
              response: followUp.text || toolResult.message,
              toolExecuted: call.name,
              toolResult,
              aiModelUsed: modelName,
            };
          } catch {
            return {
              response: toolResult.message,
              toolExecuted: call.name,
              toolResult,
              aiModelUsed: modelName,
            };
          }
        }

        const text = response.text || '¡Aquí estoy contigo! ¿En qué más te puedo ayudar hoy? ✨';
        return { response: text, aiModelUsed: modelName };
      } catch (err: any) {
        console.warn('Gemini 2.5 Flash API error, falling back to rule engine:', err?.message || err);
      }
    }

    // Built-in Conversational Natural Language Engine (works offline or without API key)
    return this.fallbackConversationalEngine(userId, userName, userMessage, todayFormatted, currentTimeFormatted);
  }

  /**
   * Rich, conversational offline engine with personality, empathy, motivational coaching,
   * and fuzzy reminder parsing when no Gemini API key is configured.
   */
  private static async fallbackConversationalEngine(
    userId: string,
    userName: string,
    message: string,
    today: string,
    timeNow: string
  ): Promise<{ response: string; toolExecuted?: string; toolResult?: unknown; aiModelUsed?: string }> {
    const text = message.trim().toLowerCase();

    // 1. Saludos amigables y pequeña charla
    if (
      /^(hola|buen(?:os)?\s*d[ií]as|buenas\s*tardes|buenas\s*noches|hey|qu[eé]\s*tal|saludos)\b/i.test(text) ||
      text === 'hola nimbo' ||
      text === 'hola'
    ) {
      const greetings = [
        `¡Hola ${userName}! 🌸 Qué alegría saludarte. ¿Cómo va tu día? Cuéntame si tienes algo en mente o si quieres que organicemos tus pendientes juntos. ✨`,
        `¡Hola! 🤖✨ Aquí está NIMBO lista para acompañarte. ¿En qué te puedo apoyar hoy? Podemos revisar tu agenda, registrar una nueva idea o simplemente platicar.`,
        `¡Buen día ${userName}! ☕ Espero que estés teniendo una jornada tranquila. ¿Quieres que veamos qué actividades tienes programadas para hoy?`,
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      return { response: randomGreeting, aiModelUsed: 'nimbo-conversational-engine' };
    }

    // 2. ¿Cómo estás? / ¿Qué tal?
    if (
      text.includes('cómo estás') ||
      text.includes('como estas') ||
      text.includes('qué tal estás') ||
      text.includes('como te va') ||
      text.includes('cómo te va')
    ) {
      return {
        response: `¡Estoy de maravilla, gracias por preguntar! 💖 Con toda la energía para ayudarte a tener un día productivo, ordenado y sin estrés. ¿Tú cómo te sientes hoy, ${userName}?`,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 3. ¿Quién eres? / ¿Cuál es tu nombre? / ¿Qué haces?
    if (
      text.includes('quién eres') ||
      text.includes('quien eres') ||
      text.includes('cómo te llamas') ||
      text.includes('como te llamas') ||
      text.includes('qué eres') ||
      text.includes('que eres') ||
      text.includes('qué puedes hacer') ||
      text.includes('que puedes hacer')
    ) {
      return {
        response: `¡Soy **NIMBO**! 🤖🌸 Tu asistente personal inteligente y compañera de organización.\n\nEstoy aquí para cuidar tu tiempo y asegurarme de que no olvides lo que de verdad importa. Conmigo puedes:\n• 📋 **Organizar tu día:** Preguntarme *"¿Qué tengo pendiente hoy?"* o *"¿Cómo está mi semana?"*\n• ⏰ **Crear recordatorios:** *"Recuérdame mañana a las 10am llamar al dentista"*\n• 💬 **Acompañamiento:** Charlar, pedirme consejos para combatir la procrastinación o desahogarte.\n• 🔔 **Alertas 24/7:** Te aviso por notificaciones push y voz natural en todos tus dispositivos.\n\n¡Estoy a tu servicio, ${userName}! ✨`,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 4. Agradecimientos
    if (
      text.includes('gracias') ||
      text.includes('muchas gracias') ||
      text.includes('te lo agradezco') ||
      text.includes('excelente servicio')
    ) {
      return {
        response: `¡De nada, ${userName}! 🌸 Me hace muy feliz ayudarte. Recuerda que siempre estoy aquí para que lleves tu día en calma. Si necesitas algo más, solo dime. ✨`,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 5. Estrés, cansancio, motivación
    if (
      text.includes('estoy cansad') ||
      text.includes('estoy estresad') ||
      text.includes('tengo mucho trabajo') ||
      text.includes('no sé por dónde empezar') ||
      text.includes('no se por donde empezar') ||
      text.includes('abrumad')
    ) {
      return {
        response: `Te entiendo perfectamente, ${userName}. A veces los días se sienten muy pesados. 🤍\n\nMi consejo de hoy: **Respira profundo y no intentes hacer todo a la vez.**\n1. Elige solo **UNA** actividad crucial para hoy.\n2. Dedícale 20 minutos sin distracciones.\n3. Date una pausa, toma un vaso con agua o un té y estírate. 🍵\n\n¿Quieres que revisemos tus pendientes y elijamos la tarea más sencilla para empezar a agarrar ritmo?`,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 6. Consultar pendientes / qué tengo
    if (
      text.includes('qué tengo') ||
      text.includes('que tengo') ||
      text.includes('pendientes') ||
      text.includes('actividades') ||
      text.includes('agenda') ||
      text.includes('mi día') ||
      text.includes('mi semana')
    ) {
      const isToday = text.includes('hoy');
      const toolArgs = isToday ? { date: today, status: 'active' } : { status: 'active' };
      const result = await executeAITool(userId, 'consultar_recordatorios', toolArgs);

      const items = (result.data as Array<{ title: string; date: string; time: string; priority: string }>) || [];
      if (items.length === 0) {
        return {
          response: isToday
            ? `¡Excelentes noticias, ${userName}! ☀️ No tienes actividades pendientes programadas para hoy en tu agenda. Disfruta tu tiempo o dime si quieres registrar una nueva meta.`
            : `No tienes recordatorios pendientes registrados en este momento. ¡Tu agenda está completamente libre y tranquila! 🌸`,
          toolExecuted: 'consultar_recordatorios',
          toolResult: result,
          aiModelUsed: 'nimbo-conversational-engine',
        };
      }

      const listStr = items
        .slice(0, 5)
        .map((i) => `• ⏰ **${i.time}** — ${i.title} *(${i.priority === 'HIGH' ? 'Prioridad Alta 🔴' : 'Normal'})*`)
        .join('\n');

      return {
        response: `Aquí tienes tus actividades pendientes ${isToday ? 'para hoy' : 'programadas'}:\n\n${listStr}${
          items.length > 5 ? `\n\n... y ${items.length - 5} más en tu agenda completa.` : ''
        }\n\n¿Deseas que complete o posponga alguna de ellas? 📋`,
        toolExecuted: 'consultar_recordatorios',
        toolResult: result,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 7. Completar actividad
    if (
      text.includes('completa') ||
      text.includes('marca como completad') ||
      text.includes('marcar como completad') ||
      text.includes('terminé') ||
      text.includes('termine') ||
      text.includes('ya hice') ||
      text.includes('ya quedó')
    ) {
      const cleaned = message
        .replace(/^(marca como completada|marca como completado|completar|completa|ya hice|ya terminé|ya quedo|ya quedó)\s*/i, '')
        .replace(/(mi actividad|la actividad|mi tarea|el recordatorio)\s*/i, '')
        .trim();

      const result = await executeAITool(userId, 'completar_recordatorio', { titleSearch: cleaned });
      return {
        response: `¡Bravo! 👏 ${result.message} Cada paso cuenta para mantener tu vida en orden. ✨`,
        toolExecuted: 'completar_recordatorio',
        toolResult: result,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 8. Posponer
    if (text.includes('pospón') || text.includes('pospon') || text.includes('posterga') || text.includes('aplaza')) {
      let minutes = 60; // default 1 hour
      if (text.includes('media hora') || text.includes('30 min')) minutes = 30;
      if (text.includes('15 min')) minutes = 15;
      if (text.includes('2 horas') || text.includes('dos horas')) minutes = 120;

      const cleaned = message
        .replace(/^(pospón|pospon|posterga|aplaza)\s*/i, '')
        .replace(/(una hora|dos horas|media hora|\d+\s*(?:minutos|min|horas|hora))\s*/i, '')
        .replace(/(mi reunión|mi recordatorio|la actividad|mi tarea)\s*/i, '')
        .trim();

      const result = await executeAITool(userId, 'posponer_recordatorio', {
        titleSearch: cleaned,
        minutes,
      });

      return {
        response: `Entendido. ⏱️ ${result.message} Te recordaré nuevamente en ese momento.`,
        toolExecuted: 'posponer_recordatorio',
        toolResult: result,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 9. Eliminar
    if (text.includes('elimina') || text.includes('borra') || text.includes('quitar recordatorio')) {
      const cleaned = message
        .replace(/^(elimina|borra|quitar recordatorio|quitar)\s*(el recordatorio|la tarea|la actividad)?\s*/i, '')
        .trim();

      const result = await executeAITool(userId, 'eliminar_recordatorio', {
        titleSearch: cleaned,
      });

      return {
        response: `Listo. 🗑️ ${result.message}`,
        toolExecuted: 'eliminar_recordatorio',
        toolResult: result,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 10. Crear recordatorio flexible (e.g. "Recuérdame...", "Agrega...", "Tengo que...", "Cita con...", "Necesito...")
    if (
      text.includes('recuérdame') ||
      text.includes('recuerdame') ||
      text.includes('agregar recordatorio') ||
      text.includes('agrega') ||
      text.includes('anota') ||
      text.includes('anotar') ||
      text.includes('crear recordatorio') ||
      text.startsWith('tengo que') ||
      text.startsWith('debo') ||
      text.startsWith('necesito') ||
      text.includes('cita con') ||
      text.includes('reunión con')
    ) {
      let cleanInput = message
        .replace(/^(recuérdame|recuerdame|anota|anotar|agrega|agregar recordatorio|tengo que|debo|necesito)\s*(que|a|de)?\s*/i, '')
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
          response: '¡Claro que sí! Pero dime, ¿cuál es el nombre o descripción de la actividad que deseas que agende? 🌸',
          aiModelUsed: 'nimbo-conversational-engine',
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
        response: `¡Listo, ${userName}! ✨ He agendado en tu calendario:\n\n📌 **${finalTitle}**\n🗓️ **Fecha:** ${targetDate}\n⏰ **Hora:** ${targetTime}${
          recurrence !== 'NONE' ? `\n🔁 **Repetición:** ${recurrence}` : ''
        }\n\nTe avisaré oportunamente por voz y alertas push para que todo salga perfecto. 🌸`,
        toolExecuted: 'crear_recordatorio',
        toolResult: result,
        aiModelUsed: 'nimbo-conversational-engine',
      };
    }

    // 11. Conversación abierta general (cuando no encaja en las anteriores)
    return {
      response: `Te escucho con atención, ${userName}. 🌸 Como tu asistente, puedo agendar tus actividades, recordarte cualquier compromiso, consultar tu agenda o platicar contigo sobre cómo organizar mejor tus metas.\n\n*(💡 Nota: Si quieres activar toda la potencia creativa, conversacional y de razonamiento profundo ilimitado de Gemini 2.5 Flash, puedes agregar tu clave de Google Gemini con el botón ✨ en el encabezado).*`,
      aiModelUsed: 'nimbo-conversational-engine',
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
    let message = `${timeGreeting}, ${userName}! 🌸 `;

    if (todayReminders.length === 0) {
      message += `Hoy no tienes actividades pendientes programadas, tu agenda está totalmente libre y en paz. ✨\n\n`;
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
      } de días anteriores que podríamos reprogramar o dar por concluido.\n\n`;
    }

    message += `¿En qué te puedo apoyar hoy? Puedes pedirme agregar una nueva cita, consultar tu semana o simplemente platicar. 🤖✨`;

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
