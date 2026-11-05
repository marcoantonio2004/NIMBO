/**
 * Synchronization Engine for NIMBO
 * Replays offline mutations to the cloud and pulls fresh data to IndexedDB.
 */

import { api } from '../api/client';
import {
  getSyncQueue,
  removeSyncQueueItem,
  saveOfflineReminder,
  saveOfflineReminders,
  saveOfflineCategories,
  deleteOfflineReminder,
} from './offlineDb';

let isSyncing = false;

export async function processSyncQueue(): Promise<{ syncedCount: number; errorsCount: number }> {
  if (isSyncing || typeof navigator === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0, errorsCount: 0 };
  }

  try {
    isSyncing = true;
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, errorsCount: 0 };
    }

    let syncedCount = 0;
    let errorsCount = 0;

    for (const item of queue) {
      try {
        switch (item.action) {
          case 'CREATE': {
            const res = await api.reminders.create(item.data);
            if (res.reminder) {
              // Replace temporary client-generated reminder with the official server record
              if (item.reminderId !== res.reminder.id) {
                await deleteOfflineReminder(item.reminderId);
              }
              await saveOfflineReminder(res.reminder);
            }
            break;
          }
          case 'UPDATE': {
            const res = await api.reminders.update(item.reminderId, item.data);
            if (res.reminder) {
              await saveOfflineReminder(res.reminder);
            }
            break;
          }
          case 'DELETE': {
            await api.reminders.delete(item.reminderId);
            await deleteOfflineReminder(item.reminderId);
            break;
          }
          case 'TOGGLE': {
            await api.reminders.toggle(item.reminderId);
            break;
          }
          case 'SNOOZE': {
            await api.reminders.snooze(item.reminderId, item.data);
            break;
          }
        }

        // Successfully applied; remove from queue
        if (item.id !== undefined) {
          await removeSyncQueueItem(item.id);
          syncedCount++;
        }
      } catch (err: any) {
        // If 404 on update/delete, consider it already deleted/missing and drop from queue
        if (err?.statusCode === 404 && item.id !== undefined) {
          await removeSyncQueueItem(item.id);
        } else {
          console.warn('Sync error for item:', item, err);
          errorsCount++;
        }
      }
    }

    // Refresh cloud dataset into local IndexedDB
    try {
      const [remindersRes, categoriesRes] = await Promise.all([
        api.reminders.list({}),
        api.categories.list(),
      ]);
      if (remindersRes?.reminders) {
        await saveOfflineReminders(remindersRes.reminders);
      }
      if (categoriesRes?.categories) {
        await saveOfflineCategories(categoriesRes.categories);
      }
    } catch (err) {
      console.warn('Could not pull fresh server state after sync:', err);
    }

    // Notify app of completion
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nimbo:synced', { detail: { syncedCount, errorsCount } })
      );
    }

    return { syncedCount, errorsCount };
  } finally {
    isSyncing = false;
  }
}

// Auto-trigger sync on 'online' event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('📶 Conexión restablecida. Sincronizando datos con NIMBO Cloud...');
    processSyncQueue().catch((err) => console.warn('Error in auto-sync:', err));
  });
}
