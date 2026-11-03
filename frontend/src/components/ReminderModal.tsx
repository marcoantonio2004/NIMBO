import React, { useRef, useEffect, useState } from 'react';
import { useReminders, ReminderItemData } from '../context/ReminderContext';
import { X, Clock, Calendar, Flag, Repeat } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminderToEdit?: ReminderItemData | null;
  initialDate?: string;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  reminderToEdit,
  initialDate,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { createReminder, updateReminder } = useReminders();

  const todayKey = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate || todayKey);
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [recurrence, setRecurrence] = useState<
    'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  >('NONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Synchronize modal open state with native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      if (reminderToEdit) {
        setTitle(reminderToEdit.title);
        setDescription(reminderToEdit.description || '');
        setDate(reminderToEdit.date);
        setTime(reminderToEdit.time);
        setPriority(reminderToEdit.priority);
        setRecurrence(
          reminderToEdit.recurrence === 'CUSTOM' ? 'NONE' : reminderToEdit.recurrence
        );
      } else {
        setTitle('');
        setDescription('');
        setDate(initialDate || todayKey);
        setTime('09:00');
        setPriority('MEDIUM');
        setRecurrence('NONE');
      }
      setError('');
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen, reminderToEdit, initialDate, todayKey]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Por favor escribe qué necesitas recordar.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        time,
        priority,
        recurrence,
      };

      if (reminderToEdit) {
        await updateReminder(reminderToEdit.id, payload);
      } else {
        await createReminder(payload);
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el recordatorio';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={handleBackdropClick}
      aria-labelledby="dialog-title"
      className="p-0 border border-[var(--line)] bg-[var(--surface)] text-[var(--text)] rounded-2xl shadow-2xl backdrop:bg-black/50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--surface-soft)]">
        <h2 id="dialog-title" className="text-base font-extrabold tracking-tight">
          {reminderToEdit ? 'Editar recordatorio' : 'Nuevo recordatorio'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)] transition-colors"
          aria-label="Cerrar ventana modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-semibold">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="modal-title" className="block text-xs font-bold text-[var(--muted)] mb-1">
            ¿Qué necesitas recordar? *
          </label>
          <input
            id="modal-title"
            type="text"
            required
            autoFocus
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Reunión con el equipo"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm font-semibold focus:border-[var(--site-primary)] outline-none transition-colors"
          />
        </div>

        {/* Date & Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-date" className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] mb-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--site-primary)]" /> Fecha *
            </label>
            <input
              id="modal-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-semibold focus:border-[var(--site-primary)] outline-none"
            />
          </div>

          <div>
            <label htmlFor="modal-time" className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] mb-1">
              <Clock className="w-3.5 h-3.5 text-[var(--site-primary)]" /> Hora *
            </label>
            <input
              id="modal-time"
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-semibold focus:border-[var(--site-primary)] outline-none"
            />
          </div>
        </div>

        {/* Priority & Recurrence Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="modal-priority" className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] mb-1">
              <Flag className="w-3.5 h-3.5 text-[var(--site-primary)]" /> Prioridad
            </label>
            <select
              id="modal-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-semibold focus:border-[var(--site-primary)] outline-none"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta (Urgente)</option>
            </select>
          </div>

          <div>
            <label htmlFor="modal-recurrence" className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] mb-1">
              <Repeat className="w-3.5 h-3.5 text-[var(--site-primary)]" /> Repetir
            </label>
            <select
              id="modal-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-semibold focus:border-[var(--site-primary)] outline-none"
            >
              <option value="NONE">No repetir</option>
              <option value="DAILY">Diario</option>
              <option value="WEEKDAYS">Lunes a Viernes</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensual</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="modal-description" className="block text-xs font-bold text-[var(--muted)] mb-1">
            Detalles o notas (opcional)
          </label>
          <textarea
            id="modal-description"
            rows={2}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lugar, enlace o notas breves..."
            className="w-full px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs focus:border-[var(--site-primary)] outline-none resize-none transition-colors"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--line)] text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface-soft)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold shadow-md shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 transition-all"
          >
            {loading ? 'Guardando...' : reminderToEdit ? 'Guardar cambios' : 'Crear recordatorio'}
          </button>
        </div>
      </form>
    </dialog>
  );
};
