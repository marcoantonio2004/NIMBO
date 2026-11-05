import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Reminder,
  FilterType,
  Category,
  SortOption,
  ViewMode,
  ReminderStats,
} from '../types';
import {
  loadReminders,
  saveReminders,
} from '../utils/storage';
import {
  getTodayKey,
  getCurrentTimeKey,
  calculateNextRecurrence,
  addMinutesToTime,
} from '../utils/dateUtils';
import confetti from 'canvas-confetti';

const THEME_KEY = 'nimbo-theme';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>(() => loadReminders());
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateTime');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Keep localStorage updated whenever reminders change
  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

  // Keep HTML root class synchronized with theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const addReminder = useCallback(
    (input: Omit<Reminder, 'id' | 'createdAt' | 'done'>): Reminder => {
      const newReminder: Reminder = {
        ...input,
        id: crypto.randomUUID(),
        done: false,
        createdAt: new Date().toISOString(),
      };
      setReminders((prev) => [newReminder, ...prev]);
      return newReminder;
    },
    []
  );

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r))
    );
  }, []);

  const toggleDone = useCallback((id: string) => {
    setReminders((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;

      const nextDone = !target.done;

      if (nextDone) {
        // Trigger celebratory confetti on completing tasks!
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#e11d68', '#f472b6', '#a855f7', '#ffffff'],
          });
        } catch {
          // ignore
        }
      }

      // If completing and has recurrence, generate the next recurrence automatically
      let nextOccurrence: Reminder | null = null;
      if (nextDone && target.recurrence && target.recurrence !== 'none') {
        const nextDate = calculateNextRecurrence(target.date, target.recurrence);
        nextOccurrence = {
          ...target,
          id: crypto.randomUUID(),
          date: nextDate,
          done: false,
          createdAt: new Date().toISOString(),
          completedAt: undefined,
        };
      }

      const updated = prev.map((r) =>
        r.id === id
          ? {
              ...r,
              done: nextDone,
              completedAt: nextDone ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            }
          : r
      );

      return nextOccurrence ? [nextOccurrence, ...updated] : updated;
    });
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const duplicateReminder = useCallback((id: string) => {
    setReminders((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;
      const copy: Reminder = {
        ...target,
        id: crypto.randomUUID(),
        title: `${target.title} (copia)`,
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: undefined,
      };
      return [copy, ...prev];
    });
  }, []);

  const snoozeReminder = useCallback((id: string, minutes: number) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const { newDate, newTime } = addMinutesToTime(r.date, r.time, minutes);
        return {
          ...r,
          date: newDate,
          time: newTime,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const snoozeUntilTomorrow = useCallback((id: string) => {
    const tomorrowKey = getTodayKey(1);
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          date: tomorrowKey,
          time: '09:00',
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const clearCompleted = useCallback((): number => {
    let count = 0;
    setReminders((prev) => {
      const remaining = prev.filter((r) => {
        if (r.done) {
          count++;
          return false;
        }
        return true;
      });
      return remaining;
    });
    return count;
  }, []);

  const reloadFromStorage = useCallback(() => {
    setReminders(loadReminders());
  }, []);

  // Compute calculated metrics
  const stats: ReminderStats = useMemo(() => {
    const todayKey = getTodayKey();
    const nowTime = getCurrentTimeKey();
    let pending = 0;
    let today = 0;
    let done = 0;
    let highPriority = 0;
    let overdue = 0;

    for (const r of reminders) {
      if (r.done) {
        done++;
      } else {
        pending++;
        if (r.date === todayKey) today++;
        if (r.priority === 'high') highPriority++;
        const isPastDate = r.date < todayKey;
        const isPastToday = r.date === todayKey && r.time.localeCompare(nowTime) < 0;
        if (isPastDate || isPastToday) {
          overdue++;
        }
      }
    }

    const total = reminders.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      total,
      pending,
      today,
      done,
      highPriority,
      overdue,
      completionRate,
      streakDays: done > 0 ? Math.min(done, 7) : 0,
    };
  }, [reminders]);

  // Filter and sort items
  const filteredReminders = useMemo(() => {
    const todayKey = getTodayKey();
    const nowTime = getCurrentTimeKey();
    const q = searchQuery.trim().toLowerCase();

    const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };

    return reminders
      .filter((r) => {
        // Text search
        if (q) {
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchDesc = (r.description || '').toLowerCase().includes(q);
          const matchTags = r.tags.some((t) => t.toLowerCase().includes(q));
          const matchCat = r.category.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchTags && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && r.category !== selectedCategory) {
          return false;
        }

        // View/Filter tab
        switch (filter) {
          case 'today':
            return r.date === todayKey;
          case 'pending':
            return !r.done;
          case 'overdue': {
            if (r.done) return false;
            const isPast = r.date < todayKey || (r.date === todayKey && r.time.localeCompare(nowTime) < 0);
            return isPast;
          }
          case 'high':
            return !r.done && r.priority === 'high';
          case 'done':
            return r.done;
          case 'all':
          default:
            return true;
        }
      })
      .sort((a, b) => {
        // Pending first unless done filter
        if (filter !== 'done' && a.done !== b.done) {
          return a.done ? 1 : -1;
        }

        switch (sortBy) {
          case 'priority':
            return priorityWeight[b.priority] - priorityWeight[a.priority];
          case 'alphabetical':
            return a.title.localeCompare(b.title);
          case 'created':
            return b.createdAt.localeCompare(a.createdAt);
          case 'dateTime':
          default:
            return a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
        }
      });
  }, [reminders, filter, selectedCategory, searchQuery, sortBy]);

  return {
    reminders,
    filteredReminders,
    filter,
    setFilter,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    theme,
    toggleTheme,
    stats,
    addReminder,
    updateReminder,
    toggleDone,
    deleteReminder,
    duplicateReminder,
    snoozeReminder,
    snoozeUntilTomorrow,
    clearCompleted,
    reloadFromStorage,
  };
}
