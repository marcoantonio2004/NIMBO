import { Recurrence } from '../types';

/**
 * Returns YYYY-MM-DD string for a given date or current date with optional day offset.
 */
export function getTodayKey(offsetDays = 0, baseDate = new Date()): string {
  const d = new Date(baseDate);
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the current time as HH:mm string.
 */
export function getCurrentTimeKey(baseDate = new Date()): string {
  const hours = String(baseDate.getHours()).padStart(2, '0');
  const minutes = String(baseDate.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Formats YYYY-MM-DD into localized Mexican Spanish date (e.g. "2 nov", "14 oct").
 */
export function formatDateMexican(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/**
 * Formats date and time into friendly relative status.
 */
export function formatRelativeDate(dateStr: string, timeStr = '00:00'): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
} {
  const todayStr = getTodayKey(0);
  const tomorrowStr = getTodayKey(1);
  const yesterdayStr = getTodayKey(-1);

  const isToday = dateStr === todayStr;
  const isTomorrow = dateStr === tomorrowStr;
  const isYesterday = dateStr === yesterdayStr;

  const now = new Date();
  const nowKey = getTodayKey();
  const nowTime = getCurrentTimeKey(now);

  const isOverdue =
    dateStr < nowKey || (dateStr === nowKey && timeStr.localeCompare(nowTime) < 0);

  let label = '';
  if (isToday) {
    label = `Hoy · ${timeStr}`;
  } else if (isTomorrow) {
    label = `Mañana · ${timeStr}`;
  } else if (isYesterday) {
    label = `Ayer · ${timeStr}`;
  } else {
    label = `${formatDateMexican(dateStr)} · ${timeStr}`;
  }

  return { label, isOverdue, isToday, isTomorrow };
}

/**
 * Dynamic greeting according to the hour of the day.
 */
export function getGreeting(hour = new Date().getHours()): string {
  if (hour < 12) return '¡Buenos días!';
  if (hour < 19) return '¡Buenas tardes!';
  return '¡Buenas noches!';
}

/**
 * Calculates the next recurrence date from a given YYYY-MM-DD date.
 */
export function calculateNextRecurrence(dateStr: string, recurrence: Recurrence): string {
  if (!recurrence || recurrence === 'none') return dateStr;
  
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  switch (recurrence) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekdays': {
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6); // 0 = Sunday, 6 = Saturday
      break;
    }
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Adds minutes to a reminder's time, rolling over into the next day if necessary.
 */
export function addMinutesToTime(
  dateStr: string,
  timeStr: string,
  minutesToAdd: number
): { newDate: string; newTime: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const date = new Date(y, m - 1, d, h, min + minutesToAdd);

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  const newHours = String(date.getHours()).padStart(2, '0');
  const newMinutes = String(date.getMinutes()).padStart(2, '0');

  return {
    newDate: `${newYear}-${newMonth}-${newDay}`,
    newTime: `${newHours}:${newMinutes}`,
  };
}
