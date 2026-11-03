import React, { useState } from 'react';
import { useReminders } from '../context/ReminderContext';
import { Plus, Sparkles, SlidersHorizontal } from 'lucide-react';

interface QuickAddProps {
  onOpenFullModal: () => void;
}

export const QuickAdd: React.FC<QuickAddProps> = ({ onOpenFullModal }) => {
  const { createReminder, categories } = useReminders();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setLoading(true);

      let text = input.trim();
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
      let date = new Date().toISOString().split('T')[0];
      let time = '09:00';
      let categoryId: string | null = null;

      // Priority match
      const pMatch = text.match(/!(alta|urgente|high|media|med|medium|baja|low)\b/i);
      if (pMatch) {
        const p = pMatch[1].toLowerCase();
        if (p === 'alta' || p === 'urgente' || p === 'high') priority = 'HIGH';
        else if (p === 'baja' || p === 'low') priority = 'LOW';
        text = text.replace(pMatch[0], ' ');
      }

      // Category match
      const catMatch = text.match(/#([\wáéíóúñ]+)/i);
      if (catMatch) {
        const catName = catMatch[1].toLowerCase();
        const found = categories.find((c) => c.name.toLowerCase() === catName);
        if (found) categoryId = found.id;
        text = text.replace(catMatch[0], ' ');
      }

      // Date match
      if (/\bmañana\b/i.test(text)) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        date = d.toISOString().split('T')[0];
        text = text.replace(/\bmañana\b/gi, ' ');
      } else if (/\bhoy\b/i.test(text)) {
        date = new Date().toISOString().split('T')[0];
        text = text.replace(/\bhoy\b/gi, ' ');
      }

      // Time match (e.g. 5pm, 14:30, a las 10am)
      const tMatch = text.match(/\b(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
      if (tMatch) {
        let h = parseInt(tMatch[1], 10);
        const m = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
        const ampm = tMatch[3] ? tMatch[3].toLowerCase() : null;

        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;

        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          text = text.replace(tMatch[0], ' ');
        }
      }

      const title = text.replace(/\s+/g, ' ').trim();
      if (!title) return;

      await createReminder({
        title,
        date,
        time,
        priority,
        categoryId,
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
          placeholder="Creación rápida: ej. Llamar al médico mañana 10am #Salud !alta"
          className="flex-1 bg-transparent border-0 text-sm font-medium text-[var(--text)] placeholder-[var(--muted)]/70 focus:outline-none py-1.5"
        />

        <div className="flex items-center gap-1.5 pr-1">
          <button
            type="button"
            onClick={onOpenFullModal}
            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)] transition-colors"
            title="Abrir formulario detallado"
            aria-label="Abrir formulario detallado"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold shadow-sm shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </form>
    </div>
  );
};
