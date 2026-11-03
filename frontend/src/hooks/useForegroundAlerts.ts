import { useEffect, useRef } from 'react';
import { ReminderItemData } from '../context/ReminderContext';
import { playReminderChime } from '../utils/sound';
import { speakReminderAlert } from '../utils/speech';

export function useForegroundAlerts(reminders: ReminderItemData[]) {
  const alertedStagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkAlerts = () => {
      const now = Date.now();

      reminders.forEach((r) => {
        if (r.status === 'COMPLETED') return;

        // Parse scheduled time
        const [y, m, d] = r.date.split('-').map(Number);
        const [h, min] = r.time.split(':').map(Number);
        const scheduledTime = new Date(y, m - 1, d, h, min, 0).getTime();

        const diffMinutes = Math.round((scheduledTime - now) / (60 * 1000));

        let stage: '1_day' | '1_hour' | '10_min' | 'exact' | null = null;
        let stageLabel = '';

        // 1 día antes (1440 min)
        if (diffMinutes >= 1438 && diffMinutes <= 1442) {
          stage = '1_day';
          stageLabel = 'Falta 1 día';
        }
        // 1 hora antes (60 min)
        else if (diffMinutes >= 58 && diffMinutes <= 62) {
          stage = '1_hour';
          stageLabel = 'Falta 1 hora';
        }
        // 10 minutos antes (10 min)
        else if (diffMinutes >= 9 && diffMinutes <= 11) {
          stage = '10_min';
          stageLabel = 'Faltan 10 minutos';
        }
        // Al momento exacto (0 min)
        else if (diffMinutes >= -1 && diffMinutes <= 1) {
          stage = 'exact';
          stageLabel = 'Es momento del evento';
        }

        if (stage) {
          const alertKey = `${r.id}-${stage}`;
          if (!alertedStagesRef.current.has(alertKey)) {
            alertedStagesRef.current.add(alertKey);

            // 1. Play chime sound
            playReminderChime();

            // 2. Speak voice alert aloud in Spanish
            speakReminderAlert(r.title, stage);

            // 3. Show native notification banner
            if (
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              try {
                new Notification(`✦ Recordatorio (${stageLabel}): ${r.title}`, {
                  body: `${stageLabel} para tu evento: ${r.title} (${r.time})`,
                  icon: '/favicon.svg',
                  tag: `alert-${alertKey}`,
                });
              } catch {}
            }
          }
        }
      });
    };

    const interval = setInterval(checkAlerts, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [reminders]);
}
