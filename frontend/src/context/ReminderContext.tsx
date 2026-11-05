import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { useForegroundAlerts } from '../hooks/useForegroundAlerts';
import confetti from 'canvas-confetti';

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isDefault: boolean;
  activeRemindersCount: number;
}

export interface ReminderItemData {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  scheduledAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'COMPLETED' | 'SNOOZED' | 'OVERDUE';
  categoryId?: string | null;
  category?: CategoryItem | null;
  recurrence: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  recurrenceInterval?: number | null;
  advanceMinutes: number;
  tags: string[];
  completedAt?: string;
}

export interface DashboardMetrics {
  total: number;
  pending: number;
  today: number;
  done: number;
  highPriority: number;
  overdue: number;
  completionRate: number;
  categories: Array<{ id: string; name: string; color: string; count: number }>;
  upcoming: ReminderItemData[];
}

interface ReminderContextType {
  reminders: ReminderItemData[];
  categories: CategoryItem[];
  metrics: DashboardMetrics | null;
  loading: boolean;
  filter: string;
  setFilter: (f: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (catId: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refreshData: () => Promise<void>;
  createReminder: (data: unknown) => Promise<ReminderItemData>;
  updateReminder: (id: string, data: unknown) => Promise<ReminderItemData>;
  deleteReminder: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  snoozeReminder: (id: string, options: { minutes?: number; untilDate?: string; untilTime?: string }) => Promise<void>;
  clearCompleted: () => Promise<number>;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<ReminderItemData[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const [filter, setFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];

      const [remindersRes, categoriesRes, metricsRes] = await Promise.all([
        api.reminders.list({
          status: filter === 'all' ? undefined : filter === 'active' ? 'active' : filter,
          categoryId: selectedCategory || undefined,
          search: searchQuery || undefined,
        }),
        api.categories.list(),
        api.stats.dashboard(todayStr),
      ]);

      setReminders(remindersRes.reminders);
      setCategories(categoriesRes.categories);
      setMetrics(metricsRes.metrics);
    } catch (err) {
      console.error('Error refreshing reminders data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filter, selectedCategory, searchQuery]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  // Audio and in-app alert when reminder is due in foreground
  useForegroundAlerts(reminders);

  const createReminder = async (data: unknown): Promise<ReminderItemData> => {
    const res = await api.reminders.create(data);
    await refreshData();
    return res.reminder;
  };

  const updateReminder = async (id: string, data: unknown): Promise<ReminderItemData> => {
    const res = await api.reminders.update(id, data);
    await refreshData();
    return res.reminder;
  };

  const deleteReminder = async (id: string) => {
    await api.reminders.delete(id);
    await refreshData();
  };

  const toggleComplete = async (id: string) => {
    const res = await api.reminders.toggle(id);
    if (res.completed) {
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#e11d68', '#f472b6', '#a855f7', '#ffffff'],
        });
      } catch {}
    }
    await refreshData();
  };

  const snoozeReminder = async (
    id: string,
    options: { minutes?: number; untilDate?: string; untilTime?: string }
  ) => {
    await api.reminders.snooze(id, options);
    await refreshData();
  };

  const clearCompleted = async (): Promise<number> => {
    const res = await api.reminders.clearCompleted();
    await refreshData();
    return res.count;
  };

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        categories,
        metrics,
        loading,
        filter,
        setFilter,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        refreshData,
        createReminder,
        updateReminder,
        deleteReminder,
        toggleComplete,
        snoozeReminder,
        clearCompleted,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
};

export const useReminders = () => {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error('useReminders must be used within a ReminderProvider');
  return ctx;
};
