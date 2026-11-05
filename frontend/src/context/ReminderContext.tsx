import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { useForegroundAlerts } from '../hooks/useForegroundAlerts';
import {
  getOfflineReminders,
  saveOfflineReminders,
  saveOfflineReminder,
  deleteOfflineReminder,
  getOfflineCategories,
  saveOfflineCategories,
  addToSyncQueue,
  getSyncQueue,
} from '../utils/offlineDb';
import { processSyncQueue } from '../utils/syncEngine';
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
  isOffline: boolean;
  pendingSyncCount: number;
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
  snoozeReminder: (
    id: string,
    options: { minutes?: number; untilDate?: string; untilTime?: string }
  ) => Promise<void>;
  clearCompleted: () => Promise<number>;
  triggerSync: () => Promise<void>;
}

function computeOfflineMetrics(
  remindersList: ReminderItemData[],
  categoriesList: CategoryItem[]
): DashboardMetrics {
  const todayStr = new Date().toISOString().split('T')[0];
  const total = remindersList.length;
  const done = remindersList.filter((r) => r.status === 'COMPLETED').length;
  const pending = remindersList.filter(
    (r) => r.status === 'PENDING' || r.status === 'SNOOZED'
  ).length;
  const today = remindersList.filter(
    (r) => r.date === todayStr && r.status !== 'COMPLETED'
  ).length;
  const highPriority = remindersList.filter(
    (r) => r.priority === 'HIGH' && r.status !== 'COMPLETED'
  ).length;
  const overdue = remindersList.filter(
    (r) => r.status === 'OVERDUE' || (r.date < todayStr && r.status !== 'COMPLETED')
  ).length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const catCounts = categoriesList.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    count: remindersList.filter((r) => r.categoryId === c.id && r.status !== 'COMPLETED').length,
  }));

  const upcoming = remindersList
    .filter((r) => r.status !== 'COMPLETED' && r.date >= todayStr)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  return {
    total,
    pending,
    today,
    done,
    highPriority,
    overdue,
    completionRate,
    categories: catCounts,
    upcoming,
  };
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<ReminderItemData[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const [isOffline, setIsOffline] = useState(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  const [filter, setFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Update sync queue count
  const checkPendingQueue = useCallback(async () => {
    try {
      const q = await getSyncQueue();
      setPendingSyncCount(q.length);
    } catch {
      // ignore
    }
  }, []);

  // Online / Offline listeners & Sync Events
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      processSyncQueue().then(() => checkPendingQueue());
    };
    const handleOffline = () => {
      setIsOffline(true);
      checkPendingQueue();
    };
    const handleSynced = () => {
      checkPendingQueue();
      refreshData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nimbo:synced', handleSynced);

    checkPendingQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('nimbo:synced', handleSynced);
    };
  }, [checkPendingQueue]);

  // Load from IndexedDB on initial mount for instant rendering
  useEffect(() => {
    async function loadFromOfflineDb() {
      try {
        const [cachedReminders, cachedCats] = await Promise.all([
          getOfflineReminders(),
          getOfflineCategories(),
        ]);
        if (cachedReminders.length > 0) {
          setReminders(cachedReminders);
          setMetrics(computeOfflineMetrics(cachedReminders, cachedCats));
        }
        if (cachedCats.length > 0) {
          setCategories(cachedCats);
        }
      } catch (err) {
        console.warn('Could not read from IndexedDB cache:', err);
      }
    }
    loadFromOfflineDb();
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      if (isActuallyOffline) {
        setIsOffline(true);
        const [cachedReminders, cachedCats] = await Promise.all([
          getOfflineReminders(),
          getOfflineCategories(),
        ]);

        let filtered = [...cachedReminders];
        if (filter === 'active') {
          filtered = filtered.filter((r) => r.status === 'PENDING' || r.status === 'SNOOZED');
        } else if (filter !== 'all') {
          filtered = filtered.filter((r) => r.status === filter);
        }
        if (selectedCategory) {
          filtered = filtered.filter((r) => r.categoryId === selectedCategory);
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.title.toLowerCase().includes(q) ||
              (r.description && r.description.toLowerCase().includes(q))
          );
        }

        setReminders(filtered);
        setCategories(cachedCats);
        setMetrics(computeOfflineMetrics(cachedReminders, cachedCats));
        await checkPendingQueue();
        return;
      }

      // Online: fetch from Cloud API
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

      // Save to IndexedDB in background
      saveOfflineReminders(remindersRes.reminders).catch(() => {});
      saveOfflineCategories(categoriesRes.categories).catch(() => {});
      await checkPendingQueue();
    } catch (err) {
      console.warn('Network error refreshing, falling back to IndexedDB:', err);
      setIsOffline(true);
      const [cachedReminders, cachedCats] = await Promise.all([
        getOfflineReminders(),
        getOfflineCategories(),
      ]);
      setReminders(cachedReminders);
      setCategories(cachedCats);
      setMetrics(computeOfflineMetrics(cachedReminders, cachedCats));
      await checkPendingQueue();
    } finally {
      setLoading(false);
    }
  }, [user, filter, selectedCategory, searchQuery, checkPendingQueue]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  // Audio and in-app alert when reminder is due in foreground
  useForegroundAlerts(reminders);

  const createReminder = async (data: any): Promise<ReminderItemData> => {
    const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isActuallyOffline) {
      // Create local optimistic reminder
      const localId = 'offline_' + crypto.randomUUID();
      const newReminder: ReminderItemData = {
        id: localId,
        title: data.title || 'Recordatorio',
        description: data.description,
        date: data.date,
        time: data.time || '09:00',
        scheduledAt: `${data.date}T${data.time || '09:00'}:00.000Z`,
        priority: data.priority || 'MEDIUM',
        status: 'PENDING',
        categoryId: data.categoryId || null,
        recurrence: data.recurrence || 'NONE',
        advanceMinutes: data.advanceMinutes || 0,
        tags: data.tags || [],
      };

      await saveOfflineReminder(newReminder);
      await addToSyncQueue('CREATE', localId, data);
      await checkPendingQueue();
      await refreshData();
      return newReminder;
    }

    try {
      const res = await api.reminders.create(data);
      await saveOfflineReminder(res.reminder);
      await refreshData();
      return res.reminder;
    } catch (err) {
      // Fallback to offline creation on network error
      const localId = 'offline_' + crypto.randomUUID();
      const newReminder: ReminderItemData = {
        id: localId,
        title: data.title || 'Recordatorio',
        description: data.description,
        date: data.date,
        time: data.time || '09:00',
        scheduledAt: `${data.date}T${data.time || '09:00'}:00.000Z`,
        priority: data.priority || 'MEDIUM',
        status: 'PENDING',
        categoryId: data.categoryId || null,
        recurrence: data.recurrence || 'NONE',
        advanceMinutes: data.advanceMinutes || 0,
        tags: data.tags || [],
      };

      await saveOfflineReminder(newReminder);
      await addToSyncQueue('CREATE', localId, data);
      setIsOffline(true);
      await checkPendingQueue();
      await refreshData();
      return newReminder;
    }
  };

  const updateReminder = async (id: string, data: any): Promise<ReminderItemData> => {
    const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isActuallyOffline) {
      const existing = reminders.find((r) => r.id === id);
      const updated: ReminderItemData = {
        ...(existing || ({} as any)),
        ...data,
        id,
      };
      await saveOfflineReminder(updated);
      await addToSyncQueue('UPDATE', id, data);
      await checkPendingQueue();
      await refreshData();
      return updated;
    }

    try {
      const res = await api.reminders.update(id, data);
      await saveOfflineReminder(res.reminder);
      await refreshData();
      return res.reminder;
    } catch (err) {
      const existing = reminders.find((r) => r.id === id);
      const updated: ReminderItemData = {
        ...(existing || ({} as any)),
        ...data,
        id,
      };
      await saveOfflineReminder(updated);
      await addToSyncQueue('UPDATE', id, data);
      setIsOffline(true);
      await checkPendingQueue();
      await refreshData();
      return updated;
    }
  };

  const deleteReminder = async (id: string) => {
    const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    await deleteOfflineReminder(id);

    if (isActuallyOffline) {
      await addToSyncQueue('DELETE', id);
      await checkPendingQueue();
      await refreshData();
      return;
    }

    try {
      await api.reminders.delete(id);
      await refreshData();
    } catch {
      await addToSyncQueue('DELETE', id);
      setIsOffline(true);
      await checkPendingQueue();
      await refreshData();
    }
  };

  const toggleComplete = async (id: string) => {
    const existing = reminders.find((r) => r.id === id);
    const newStatus = existing?.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';

    if (existing) {
      const updated: ReminderItemData = {
        ...existing,
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
      };
      await saveOfflineReminder(updated);
    }

    if (newStatus === 'COMPLETED') {
      try {
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#e11d68', '#f472b6', '#a855f7', '#ffffff'],
        });
      } catch {}
    }

    const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isActuallyOffline) {
      await addToSyncQueue('TOGGLE', id);
      await checkPendingQueue();
      await refreshData();
      return;
    }

    try {
      await api.reminders.toggle(id);
      await refreshData();
    } catch {
      await addToSyncQueue('TOGGLE', id);
      setIsOffline(true);
      await checkPendingQueue();
      await refreshData();
    }
  };

  const snoozeReminder = async (
    id: string,
    options: { minutes?: number; untilDate?: string; untilTime?: string }
  ) => {
    const isActuallyOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isActuallyOffline) {
      await addToSyncQueue('SNOOZE', id, options);
      await checkPendingQueue();
      await refreshData();
      return;
    }

    try {
      await api.reminders.snooze(id, options);
      await refreshData();
    } catch {
      await addToSyncQueue('SNOOZE', id, options);
      setIsOffline(true);
      await checkPendingQueue();
      await refreshData();
    }
  };

  const clearCompleted = async (): Promise<number> => {
    const completedItems = reminders.filter((r) => r.status === 'COMPLETED');
    for (const item of completedItems) {
      await deleteReminder(item.id);
    }
    return completedItems.length;
  };

  const triggerSync = async () => {
    await processSyncQueue();
    await checkPendingQueue();
    await refreshData();
  };

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        categories,
        metrics,
        loading,
        isOffline,
        pendingSyncCount,
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
        triggerSync,
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
