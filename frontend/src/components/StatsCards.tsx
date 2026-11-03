import React from 'react';
import { useReminders } from '../context/ReminderContext';
import { Clock, Calendar, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export const StatsCards: React.FC = () => {
  const { metrics, filter, setFilter } = useReminders();

  if (!metrics) return null;

  const stats = [
    {
      id: 'active',
      title: 'Pendientes',
      note: 'Por completar',
      count: metrics.pending,
      icon: Clock,
      color: 'text-[var(--site-primary)] bg-[var(--site-secondary)]',
    },
    {
      id: 'today',
      title: 'Para hoy',
      note: 'En tu agenda de hoy',
      count: metrics.today,
      icon: Calendar,
      color: 'text-blue-600 bg-blue-500/10',
    },
    {
      id: 'OVERDUE',
      title: 'Vencidos',
      note: 'Requieren atención',
      count: metrics.overdue,
      icon: AlertCircle,
      color: 'text-red-500 bg-red-500/10',
    },
    {
      id: 'COMPLETED',
      title: 'Completados',
      note: 'Tareas finalizadas',
      count: metrics.done,
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      id: 'high',
      title: 'Prioridad alta',
      note: 'Urgentes',
      count: metrics.highPriority,
      icon: AlertTriangle,
      color: 'text-amber-600 bg-amber-500/10',
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 my-6">
      {stats.map((s) => {
        const Icon = s.icon;
        const isActive = filter === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setFilter(filter === s.id ? 'all' : s.id)}
            className={`text-left p-4 rounded-2xl border transition-all duration-150 ${
              isActive
                ? 'border-[var(--site-primary)] bg-[var(--surface-soft)] shadow-md ring-2 ring-[var(--site-primary)]/20'
                : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--site-primary)]/40 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--muted)]">{s.title}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight text-[var(--text)]">
              {s.count}
            </div>
            <div className="text-[11px] font-medium text-[var(--muted)] mt-0.5 truncate">
              {s.note}
            </div>
          </button>
        );
      })}
    </section>
  );
};
