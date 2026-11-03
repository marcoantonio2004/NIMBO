import { useEffect, useRef } from 'react';
import { ReminderItemData } from '../context/ReminderContext';
import { playReminderChime } from '../utils/sound';

export function useForegroundAlerts(reminders: ReminderItemData[]) {
  const alertedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkDueReminders = () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nowHours = String(now.getHours()).padStart(2, '0');
      const nowMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeKey = `${nowHours}:${nowMinutes}`;

      reminders.forEach((r) => {
        if (r.status === 'COMPLETED') return;

        // Check if reminder is for today and its scheduled time is reached
        if (r.date === todayStr && r.time === currentTimeKey) {
          const alertKey = `${r.id}-${r.date}-${r.time}`;
          if (!alertedIdsRef.current.has(alertKey)) {
            alertedIdsRef.current.add(alertKey);

            // Play audio alert chime
            playReminderChime();

            // Native browser notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`✦ Recordatorio: ${r.title}`, {
                  body: r.description || `Actividad programada para las ${r.time}`,
                  icon: '/favicon.svg',
                  tag: `due-${r.id}`,
                });
              } catch {}
            }
          }
        }
      });
    };

    const interval = setInterval(checkDueReminders, 5000);
    return () => clearInterval(interval);
  }, [reminders]);
}
