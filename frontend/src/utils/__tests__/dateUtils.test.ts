import { describe, it, expect } from 'vitest';
import {
  getTodayKey,
  formatDateMexican,
  formatRelativeDate,
  getGreeting,
  calculateNextRecurrence,
  addMinutesToTime,
} from '../dateUtils';

describe('dateUtils', () => {
  it('generates today key in YYYY-MM-DD format', () => {
    const key = getTodayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('calculates offsets accurately', () => {
    const fixed = new Date(2026, 4, 15); // 15 May 2026
    expect(getTodayKey(0, fixed)).toBe('2026-05-15');
    expect(getTodayKey(1, fixed)).toBe('2026-05-16');
    expect(getTodayKey(-1, fixed)).toBe('2026-05-14');
  });

  it('formats dates in Mexican Spanish', () => {
    const formatted = formatDateMexican('2026-11-02');
    expect(formatted.toLowerCase()).toContain('nov');
    expect(formatted).toContain('2');
  });

  it('returns proper greeting based on hour', () => {
    expect(getGreeting(8)).toBe('¡Buenos días!');
    expect(getGreeting(14)).toBe('¡Buenas tardes!');
    expect(getGreeting(21)).toBe('¡Buenas noches!');
  });

  it('calculates recurrences properly', () => {
    expect(calculateNextRecurrence('2026-05-10', 'none')).toBe('2026-05-10');
    expect(calculateNextRecurrence('2026-05-10', 'daily')).toBe('2026-05-11');
    expect(calculateNextRecurrence('2026-05-10', 'weekly')).toBe('2026-05-17');
    expect(calculateNextRecurrence('2026-05-10', 'monthly')).toBe('2026-06-10');

    // Weekday recurrence: Friday 2026-05-08 -> should jump to Monday 2026-05-11
    // Let's verify day of week: May 8, 2026 is Friday (new Date(2026, 4, 8).getDay() === 5)
    expect(calculateNextRecurrence('2026-05-08', 'weekdays')).toBe('2026-05-11');
  });

  it('adds minutes with hour and day rollover', () => {
    const result1 = addMinutesToTime('2026-05-10', '10:00', 15);
    expect(result1.newTime).toBe('10:15');
    expect(result1.newDate).toBe('2026-05-10');

    const result2 = addMinutesToTime('2026-05-10', '23:45', 30);
    expect(result2.newTime).toBe('00:15');
    expect(result2.newDate).toBe('2026-05-11');
  });
});
