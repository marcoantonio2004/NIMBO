import { Category, Priority } from '../types';
import { getTodayKey } from './dateUtils';

export interface ParsedReminderInput {
  title: string;
  date: string;
  time: string;
  priority: Priority;
  category: Category;
  tags: string[];
}

const DAY_NAME_MAP: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};

/**
 * Calculates next date for a given day of the week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
 */
export function getNextDayOfWeek(dayIndex: number): string {
  const d = new Date();
  const currentDay = d.getDay();
  let daysUntil = (dayIndex - currentDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // next occurrence
  d.setDate(d.getDate() + daysUntil);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a natural language reminder string into structured fields.
 */
export function parseQuickReminder(input: string): ParsedReminderInput {
  let text = input.trim();
  let priority: Priority = 'medium';
  const category: Category = 'Personal';
  let date = getTodayKey();
  let time = '09:00';
  const tags: string[] = [];

  // 1. Priority flags: !alta, !urgente, !high, !media, !medium, !baja, !low
  const priorityMatch = text.match(/!(alta|urgente|high|media|med|medium|baja|low)\b/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    if (p === 'alta' || p === 'urgente' || p === 'high') priority = 'high';
    else if (p === 'baja' || p === 'low') priority = 'low';
    else priority = 'medium';
    text = text.replace(priorityMatch[0], ' ');
  }

  // 2. Date expressions:
  // "pasado mañana"
  if (/\bpasado\s+mañana\b/i.test(text)) {
    date = getTodayKey(2);
    text = text.replace(/\bpasado\s+mañana\b/gi, ' ');
  }
  // "mañana"
  else if (/\bmañana\b/i.test(text)) {
    date = getTodayKey(1);
    text = text.replace(/\bmañana\b/gi, ' ');
  }
  // "hoy"
  else if (/\bhoy\b/i.test(text)) {
    date = getTodayKey(0);
    text = text.replace(/\bhoy\b/gi, ' ');
  }

  // Specific day of week: "el viernes", "el lunes", "proximo sabado", "este viernes", "viernes"
  const dayMatch = text.match(/\b(?:el\s+|próximo\s+|proximo\s+|este\s+)?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i);
  if (dayMatch) {
    const dayName = dayMatch[1].toLowerCase();
    if (dayName in DAY_NAME_MAP) {
      date = getNextDayOfWeek(DAY_NAME_MAP[dayName]);
      text = text.replace(dayMatch[0], ' ');
    }
  }

  // 3. Time expressions:
  // e.g. "a las 5 de la tarde", "a las 5 de la noche", "a las 10 de la mañana", "a las 17:00", "5pm", "5:30pm"
  const timeRegex = /\b(?:a\s+las\s+|a\s+la\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|de\s+la\s+tarde|de\s+la\s+noche|de\s+la\s+mañana)?\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const modifier = (timeMatch[3] || '').toLowerCase();

    if ((modifier.includes('pm') || modifier.includes('tarde') || modifier.includes('noche')) && hours < 12) {
      hours += 12;
    }
    if ((modifier.includes('am') || modifier.includes('mañana')) && hours === 12) {
      hours = 0;
    }

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      text = text.replace(timeMatch[0], ' ');
    }
  }

  // 4. Clean up remaining title (strip words like "recordatorio de", "recordar", "para el")
  const cleanTitle = text
    .replace(/^(recordatorio\s+de|recuérdame\s+|recuerdame\s+|recordar\s+)/i, '')
    .replace(/\s+(para\s+el|el)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s-]+|[,.\s-]+$/g, '')
    .trim();

  // Capitalize first letter
  const finalTitle = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : input.trim();

  return {
    title: finalTitle,
    date,
    time,
    priority,
    category,
    tags,
  };
}
