import React, { useState } from 'react';
import { ReminderItemData, useReminders } from '../context/ReminderContext';
import {
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  Repeat,
  AlarmClock,
  Check,
} from 'lucide-react';

interface ReminderItemProps {
  reminder: ReminderItemData;
  onEdit: (reminder: ReminderItemData) => void;
}

export const ReminderItem: React.FC<ReminderItemProps> = ({ reminder, onEdit }) => {
  const { toggleComplete, deleteReminder, snoozeReminder } = useReminders();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDone = reminder.status === 'COMPLETED';
  const isOverdue = reminder.status === 'OVERDUE';
  const isSnoozed = reminder.status === 'SNOOZED';

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = reminder.date === todayStr;

  // Mexican date formatter
  const [y, m, d] = reminder.date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  const formattedDate = dateObj.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const handleDelete = async () => {
    if (confirm(`¿Eliminar el recordatorio "${reminder.title}"?`)) {
      setIsDeleting(true);
      await deleteReminder(reminder.id);
    }
  };

  const handleSnooze = async (minutes: number) => {
    setMenuOpen(false);
    await snoozeReminder(reminder.id, { minutes });
  };

  const handleSnoozeTomorrow = async () => {
    setMenuOpen(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomStr = tomorrow.toISOString().split('T')[0];
    await snoozeReminder(reminder.id, { untilDate: tomStr, untilTime: '09:00' });
  };

  return (
    <article
      className={`group relative flex items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
        isDone
          ? 'bg-[var(--surface-soft)]/50 border-[var(--line)] opacity-60'
          : isOverdue
          ? 'bg-red-500/[0.03] border-red-500/20 hover:border-red-500/40'
          : 'bg-[var(--surface)] border-[var(--line)] hover:border-[var(--site-primary)]/40 hover:shadow-xs'
      } ${isDeleting ? 'opacity-30 scale-98' : ''}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Checkbox */}
        <button
          type="button"
          role="checkbox"
          aria-checked={isDone}
          onClick={() => toggleComplete(reminder.id)}
          className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
            isDone
              ? 'bg-[var(--site-primary)] border-[var(--site-primary)] text-white'
              : 'border-[var(--muted)]/40 hover:border-[var(--site-primary)] bg-[var(--surface)]'
          }`}
          aria-label={isDone ? 'Reactivar recordatorio' : 'Marcar recordatorio como completado'}
        >
          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Title and date */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-sm font-bold leading-snug tracking-tight text-[var(--text)] transition-colors truncate ${
                isDone ? 'line-through text-[var(--muted)]' : ''
              }`}
            >
              {reminder.title}
            </h3>

            {reminder.priority === 'HIGH' && !isDone && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                ALTA
              </span>
            )}

            {reminder.recurrence !== 'NONE' && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--site-secondary)] text-[var(--site-on-secondary)]"
                title={`Recurrencia: ${reminder.recurrence}`}
              >
                <Repeat className="w-2.5 h-2.5" />
                <span className="capitalize">{reminder.recurrence.toLowerCase()}</span>
              </span>
            )}
          </div>

          {reminder.description && (
            <p className="mt-0.5 text-xs text-[var(--muted)] line-clamp-1">
              {reminder.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)]">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isOverdue
                  ? 'text-red-500 font-bold'
                  : isToday
                  ? 'text-[var(--site-primary)] font-bold'
                  : ''
              }`}
            >
              <Clock className="w-3 h-3" />
              {isToday ? `Hoy a las ${reminder.time}` : `${formattedDate} · ${reminder.time}`}
              {isOverdue && ' (Vencido)'}
              {isSnoozed && ' (Pospuesto)'}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="relative flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(reminder)}
          className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-soft)] transition-colors"
          title="Editar"
          aria-label="Editar"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-soft)] transition-colors"
            title="Opciones"
            aria-label="Opciones"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-lg py-1 z-30 animate-fade-in text-xs font-semibold">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider">
                Posponer
              </div>
              <button
                onClick={() => handleSnooze(15)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--surface-soft)] flex items-center gap-2"
              >
                <AlarmClock className="w-3.5 h-3.5 text-[var(--site-primary)]" />
                <span>15 minutos</span>
              </button>
              <button
                onClick={() => handleSnooze(60)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--surface-soft)] flex items-center gap-2"
              >
                <AlarmClock className="w-3.5 h-3.5 text-[var(--site-primary)]" />
                <span>1 hora</span>
              </button>
              <button
                onClick={handleSnoozeTomorrow}
                className="w-full text-left px-3 py-2 hover:bg-[var(--surface-soft)] flex items-center gap-2"
              >
                <AlarmClock className="w-3.5 h-3.5 text-[var(--site-primary)]" />
                <span>Mañana 9am</span>
              </button>

              <div className="my-1 border-t border-[var(--line)]" />

              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
