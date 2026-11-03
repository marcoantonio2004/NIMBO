import React, { useState } from 'react';
import { useReminders } from '../context/ReminderContext';
import { parseQuickReminder } from '../utils/parser';
import { Plus, Sparkles, SlidersHorizontal } from 'lucide-react';

interface QuickAddProps {
  onOpenFullModal: () => void;
}

export const QuickAdd: React.FC<QuickAddProps> = ({ onOpenFullModal }) => {
  const { createReminder } = useReminders();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setLoading(true);
      const parsed = parseQuickReminder(input.trim());

      await createReminder({
        title: parsed.title,
        date: parsed.date,
        time: parsed.time,
        priority: parsed.priority.toUpperCase(),
      });

      setInput('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-2 sm:p-2.5 shadow-xs mb-6">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="pl-2.5 text-[var(--site-primary)]">
          <Sparkles className="w-4 h-4" />
        </div>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: Reunión a las 5 de la tarde el viernes..."
          className="flex-1 bg-transparent border-0 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)]/70 focus:outline-none py-1.5"
        />

        <div className="flex items-center gap-1.5 pr-1">
          <button
            type="button"
            onClick={onOpenFullModal}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)] transition-colors"
            title="Formulario manual detallado"
            aria-label="Formulario manual detallado"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold shadow-sm shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Guardar</span>
          </button>
        </div>
      </form>
    </div>
  );
};
