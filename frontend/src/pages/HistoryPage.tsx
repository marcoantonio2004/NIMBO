import React from 'react';
import { useReminders } from '../context/ReminderContext';
import { CheckCircle2, Trash2, Award, Clock } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { reminders, metrics, clearCompleted } = useReminders();

  const completedReminders = reminders.filter((r) => r.status === 'COMPLETED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">
            Historial de Cumplimiento
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)]">
            Registro y trazabilidad de todas tus actividades finalizadas
          </p>
        </div>

        {completedReminders.length > 0 && (
          <button
            onClick={() => clearCompleted()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar historial</span>
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text)]">{metrics?.done || 0}</div>
            <div className="text-xs text-[var(--muted)] font-medium">Actividades completadas</div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--site-secondary)] text-[var(--site-on-secondary)] flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text)]">{metrics?.completionRate || 0}%</div>
            <div className="text-xs text-[var(--muted)] font-medium">Tasa de cumplimiento</div>
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-[var(--text)]">{metrics?.pending || 0}</div>
            <div className="text-xs text-[var(--muted)] font-medium">Actividades aún en curso</div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 shadow-xs">
        <h2 className="text-sm font-extrabold text-[var(--text)] mb-4">Registro de Tareas Finalizadas</h2>

        {completedReminders.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)] space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40" />
            <p className="text-sm font-semibold">No hay actividades completadas en el registro.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {completedReminders.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[var(--text)] line-through opacity-70 truncate">
                    {r.title}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    Programada para: {r.date} a las {r.time}
                    {r.category && ` · ${r.category.name}`}
                  </div>
                </div>
                <span className="flex-shrink-0 text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg text-[10px] font-extrabold">
                  Completada
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
