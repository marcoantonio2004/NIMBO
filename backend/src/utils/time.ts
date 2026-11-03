import { RecurrenceType } from '@prisma/client';

/**
 * Calculates a UTC Date object for a given local date (YYYY-MM-DD), local time (HH:mm)
 * and optional notification advance in minutes.
 */
export function calculateScheduledTimestamp(
  dateStr: string,
  timeStr: string,
  advanceMinutes = 0
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);

  // Construct local date time
  const target = new Date(y, m - 1, d, h, min, 0, 0);

  // Subtract advance minutes if notification should arrive earlier
  if (advanceMinutes > 0) {
    target.setMinutes(target.getMinutes() - advanceMinutes);
  }

  return target;
}

/**
 * Calculates next recurrence date string (YYYY-MM-DD).
 */
export function getNextRecurrenceDate(
  currentDateStr: string,
  recurrence: RecurrenceType,
  interval = 1
): string {
  const [y, m, d] = currentDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  switch (recurrence) {
    case 'DAILY':
      date.setDate(date.getDate() + (interval || 1));
      break;

    case 'WEEKDAYS': {
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6); // Skip Saturday (6) and Sunday (0)
      break;
    }

    case 'WEEKLY':
      date.setDate(date.getDate() + 7 * (interval || 1));
      break;

    case 'MONTHLY':
      date.setMonth(date.getMonth() + (interval || 1));
      break;

    case 'YEARLY':
      date.setFullYear(date.getFullYear() + (interval || 1));
      break;

    case 'NONE':
    case 'CUSTOM':
    default:
      return currentDateStr;
  }

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}
