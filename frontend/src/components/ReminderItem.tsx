import React, { useState } from 'react';
import { ReminderItemData, useReminders } from '../context/ReminderContext';
import {
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  Repeat,
  BellRing,
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

  const priorityClasses = {
    HIGH: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    LOW: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  };

  const priorityLabels = {
    HIGH: 'ALTA',
    MEDIUM: 'MEDIA',
    LOW: 'BAJA',
  };

  return (
    <article
      className={`group relative flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-200 ${
        isDone
          ? 'bg-[var(--surface-soft)]/50 border-[var(--line)] opacity-60'
          : isOverdue
          ? 'bg-red-500/[0.03] border-red-500/20 hover:border-red-500/40'
          : 'bg-[var(--surface)] border-[var(--line)] hover:border-[var(--site-primary)]/40 hover:shadow-xs'
      } ${isDeleting ? 'opacity-30 scale-98' : ''}`}
    >
      {/* Accessible Checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        onClick={() => toggleComplete(reminder.id)}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
          isDone
            ? 'bg-[var(--site-primary)] border-[var(--site-primary)] text-white'
            : 'border-[var(--muted)]/40 hover:border-[var(--site-primary)] bg-[var(--surface)]'
        }`}
        aria-label={isDone ? 'Reactivar recordatorio' : 'Marcar recordatorio como completado'}
      >
        {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3
            className={`text-sm font-bold leading-snug tracking-tight text-[var(--text)] transition-colors ${
              isDone ? 'line-through text-[var(--muted)]' : ''
            }`}
          >
            {reminder.title}
          </h3>

          {/* Recurrence badge */}
          {reminder.recurrence !== 'NONE' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--site-secondary)] text-[var(--site-on-secondary)]"
              title={`Recurrencia: ${reminder.recurrence}`}
            >
              <Repeat className="w-2.5 h-2.5" />
              <span className="capitalize">{reminder.recurrence.toLowerCase()}</span>
            </span>
          )}

          {/* Advance alert badge */}
          {reminder.advanceMinutes > 0 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400"
              title={`Aviso programado ${reminder.advanceMinutes} minutos antes`}
            >
              <BellRing className="w-2.5 h-2.5" />
              <span>{reminder.advanceMinutes}m antes</span>
            </span>
          )}
        </div>

        {/* Description */}
        {reminder.description && (
          <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
            {reminder.description}
          </p>
        )}

        {/* Metadata Footer */}
        <div className="flex items-center gap-2 flex-wrap mt-2.5 text-xs text-[var(--muted)]">
          {/* Date & Time pill */}
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

          <span className="w-1 h-1 rounded-full bg-[var(--muted)]/40" />

          {/* Category */}
          {reminder.category ? (
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: reminder.category.color }}
              />
              <span>{reminder.category.name}</span>
            </span>
          ) : (
            <span>Personal</span>
          )}

          <span className="w-1 h-1 rounded-full bg-[var(--muted)]/40" />

          {/* Priority */}
          <span
            className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${
              priorityClasses[reminder.priority]
            }`}
          >
            {priorityLabels[reminder.priority]}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="relative flex items-center gap-1">
        <button
          onClick={() => onEdit(reminder)}
          className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-soft)] transition-colors opacity-80 group-hover:opacity-100"
          title="Editar recordatorio"
          aria-label="Editar recordatorio"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        {/* Snooze & Extra menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-lg hover:bg-[var(--surface-soft)] transition-colors"
            title="Opciones adicionales"
            aria-label="Opciones adicionales"
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
                <span>Para mañana a las 9am</span>
              </button>

              <div className="my-1 border-t border-[var(--line)]" />

              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-2 text-red-500 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar recordatorio</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
