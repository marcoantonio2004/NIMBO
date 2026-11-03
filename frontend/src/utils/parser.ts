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

const CATEGORY_MAP: Record<string, Category> = {
  personal: 'Personal',
  trabajo: 'Trabajo',
  laboral: 'Trabajo',
  estudio: 'Estudio',
  escuela: 'Estudio',
  universidad: 'Estudio',
  salud: 'Salud',
  medico: 'Salud',
  médico: 'Salud',
  finanzas: 'Finanzas',
  dinero: 'Finanzas',
  banco: 'Finanzas',
  hogar: 'Hogar',
  casa: 'Hogar',
  otro: 'Otro',
};

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
function getNextDayOfWeek(dayIndex: number): string {
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
  let category: Category = 'Personal';
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

  // 2. Category / tag hashtags: #Trabajo, #salud, etc.
  const tagMatches = text.match(/#([\wáéíóúñ]+)/gi);
  if (tagMatches) {
    for (const tagWithHash of tagMatches) {
      const cleanTag = tagWithHash.replace('#', '').toLowerCase();
      if (CATEGORY_MAP[cleanTag]) {
        category = CATEGORY_MAP[cleanTag];
      } else {
        tags.push(cleanTag);
      }
      text = text.replace(tagWithHash, ' ');
    }
  }

  // 3. Date expressions:
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
  // Specific day of week: "el viernes", "el lunes", "proximo sabado"
  const dayMatch = text.match(/\b(?:el\s+|próximo\s+|proximo\s+)?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i);
  if (dayMatch) {
    const dayName = dayMatch[1].toLowerCase();
    if (dayName in DAY_NAME_MAP) {
      date = getNextDayOfWeek(DAY_NAME_MAP[dayName]);
      text = text.replace(dayMatch[0], ' ');
    }
  }

  // 4. Time expressions:
  // e.g. "a las 14:30", "15:00", "5:30pm", "9am", "a las 8pm"
  const timeRegex = /\b(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
  const timeMatch = text.match(timeRegex);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      text = text.replace(timeMatch[0], ' ');
    }
  }

  // 5. Clean up remaining title
  const cleanTitle = text
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s-]+|[,.\s-]+$/g, '')
    .trim();

  return {
    title: cleanTitle || input.trim(),
    date,
    time,
    priority,
    category,
    tags,
  };
}
