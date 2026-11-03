import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadReminders,
  saveReminders,
  exportToJSON,
  exportToCSV,
  importFromJSON,
  getSeedReminders,
} from '../storage';
import { Reminder } from '../../types';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides seed reminders when storage is initially empty', () => {
    const reminders = loadReminders();
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0]).toHaveProperty('title');
  });

  it('persists and loads saved reminders', () => {
    const custom: Reminder[] = [
      {
        id: 'test-1',
        title: 'Custom Task',
        date: '2026-11-02',
        time: '12:00',
        priority: 'high',
        category: 'Personal',
        tags: [],
        done: false,
        createdAt: new Date().toISOString(),
      },
    ];
    saveReminders(custom);
    const loaded = loadReminders();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Custom Task');
  });

  it('exports to JSON and CSV accurately', () => {
    const list: Reminder[] = [
      {
        id: '123',
        title: 'Task Alpha',
        date: '2026-11-02',
        time: '11:00',
        priority: 'medium',
        category: 'Trabajo',
        tags: ['demo'],
        done: true,
        createdAt: '2026-11-02T10:00:00Z',
      },
    ];
    const json = exportToJSON(list);
    expect(json).toContain('Task Alpha');

    const csv = exportToCSV(list);
    expect(csv).toContain('"Task Alpha"');
    expect(csv).toContain('"Trabajo"');
  });

  it('imports valid JSON and rejects invalid structure', () => {
    const raw = JSON.stringify([
      {
        id: 'import-1',
        title: 'Imported Task',
        date: '2026-12-01',
        time: '08:00',
        priority: 'low',
        category: 'Estudio',
      },
    ]);
    const res = importFromJSON(raw);
    expect(res.success).toBe(true);
    expect(res.count).toBe(1);

    const failRes = importFromJSON('not-json');
    expect(failRes.success).toBe(false);
  });
});
