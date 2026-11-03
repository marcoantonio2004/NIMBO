import { Reminder } from '../types';
import { getTodayKey } from './dateUtils';

const STORAGE_KEY_V2 = 'nimbo-reminders-v2';
const STORAGE_KEY_V1 = 'nimbo-reminders-v1';

export function getSeedReminders(): Reminder[] {
  const todayKey = getTodayKey(0);
  const tomorrowKey = getTodayKey(1);
  const inTwoDaysKey = getTodayKey(2);

  return [
    {
      id: 'demo-1',
      title: 'Revisar pendientes y prioridades de la semana',
      description: 'Definir los tres objetivos estratégicos principales.',
      date: todayKey,
      time: '10:00',
      priority: 'medium',
      category: 'Personal',
      tags: ['planificación'],
      done: false,
      createdAt: new Date().toISOString(),
      recurrence: 'weekly',
      audioAlert: true,
    },
    {
      id: 'demo-2',
      title: 'Preparar documentos clave para la reunión',
      description: 'Revisar presentación e informes de resultados trimestrales.',
      date: tomorrowKey,
      time: '09:30',
      priority: 'high',
      category: 'Trabajo',
      tags: ['urgente', 'reportes'],
      done: false,
      createdAt: new Date().toISOString(),
      recurrence: 'none',
      audioAlert: true,
    },
    {
      id: 'demo-3',
      title: 'Dedicar 30 minutos a aprender y leer',
      description: 'Avance de libro técnico o documentación moderna.',
      date: todayKey,
      time: '18:00',
      priority: 'low',
      category: 'Estudio',
      tags: ['aprendizaje'],
      done: true,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      recurrence: 'daily',
      audioAlert: false,
    },
    {
      id: 'demo-4',
      title: 'Pago de servicios y revisión de presupuesto mensual',
      description: 'Verificar recibos de luz, agua y servicios en línea.',
      date: inTwoDaysKey,
      time: '12:00',
      priority: 'high',
      category: 'Finanzas',
      tags: ['pagos'],
      done: false,
      createdAt: new Date().toISOString(),
      recurrence: 'monthly',
      audioAlert: true,
    },
  ];
}

export function loadReminders(): Reminder[] {
  if (typeof window === 'undefined') return [];

  try {
    const v2Raw = localStorage.getItem(STORAGE_KEY_V2);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Check v1 migration
    const v1Raw = localStorage.getItem(STORAGE_KEY_V1);
    if (v1Raw) {
      const parsedV1 = JSON.parse(v1Raw);
      if (Array.isArray(parsedV1) && parsedV1.length > 0) {
        const migrated: Reminder[] = parsedV1.map((item) => ({
          id: item.id || crypto.randomUUID(),
          title: item.title || 'Recordatorio sin título',
          description: item.description || '',
          date: item.date || getTodayKey(),
          time: item.time || '09:00',
          priority: item.priority || 'medium',
          category: item.category || 'Personal',
          tags: item.tags || [],
          done: !!item.done,
          completedAt: item.completedAt,
          createdAt: item.createdAt || new Date().toISOString(),
          recurrence: item.recurrence || 'none',
          audioAlert: item.audioAlert ?? true,
        }));
        saveReminders(migrated);
        return migrated;
      }
    }

    // Fallback to initial seeds
    const seed = getSeedReminders();
    saveReminders(seed);
    return seed;
  } catch (err) {
    console.error('Error loading reminders from localStorage:', err);
    return getSeedReminders();
  }
}

export function saveReminders(reminders: Reminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(reminders));
  } catch (err) {
    console.error('Error saving reminders to localStorage:', err);
  }
}

export function exportToJSON(reminders: Reminder[]): string {
  return JSON.stringify(reminders, null, 2);
}

export function exportToCSV(reminders: Reminder[]): string {
  const headers = ['id', 'title', 'description', 'date', 'time', 'priority', 'category', 'done', 'recurrence'];
  const rows = reminders.map((r) => [
    `"${r.id}"`,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.description || '').replace(/"/g, '""')}"`,
    `"${r.date}"`,
    `"${r.time}"`,
    `"${r.priority}"`,
    `"${r.category}"`,
    r.done ? '1' : '0',
    `"${r.recurrence || 'none'}"`,
  ]);
  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

export function importFromJSON(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'El archivo no contiene un arreglo válido.' };
    }

    const validated: Reminder[] = parsed.map((item, index) => {
      if (!item.title) throw new Error(`El elemento en el índice ${index} no tiene título.`);
      return {
        id: item.id || crypto.randomUUID(),
        title: String(item.title).trim(),
        description: item.description ? String(item.description).trim() : '',
        date: item.date || getTodayKey(),
        time: item.time || '09:00',
        priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
        category: item.category || 'Personal',
        tags: Array.isArray(item.tags) ? item.tags : [],
        done: Boolean(item.done),
        completedAt: item.completedAt,
        createdAt: item.createdAt || new Date().toISOString(),
        recurrence: item.recurrence || 'none',
        audioAlert: item.audioAlert ?? true,
      };
    });

    saveReminders(validated);
    return { success: true, count: validated.length };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido al importar';
    return { success: false, count: 0, error: message };
  }
}
