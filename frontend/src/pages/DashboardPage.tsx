import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReminders, ReminderItemData } from '../context/ReminderContext';
import { StatsCards } from '../components/StatsCards';
import { QuickAdd } from '../components/QuickAdd';
import { ReminderItem } from '../components/ReminderItem';
import { ReminderModal } from '../components/ReminderModal';
import { Plus, Trash2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    reminders,
    filter,
    setFilter,
    clearCompleted,
  } = useReminders();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItemData | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '¡Buenos días!' : hour < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';

  const todayDateStr = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleEdit = (reminder: ReminderItemData) => {
    setSelectedReminder(reminder);
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setSelectedReminder(null);
    setModalOpen(true);
  };

  const filterTabs = [
    { id: 'all', label: 'Todos' },
    { id: 'today', label: 'Para hoy' },
    { id: 'active', label: 'Pendientes' },
    { id: 'COMPLETED', label: 'Completados' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header Greeting */}
      <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-[var(--site-primary)]">
            Tu espacio, en orden
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)] mt-1">
            {greeting} {user?.name ? user.name.split(' ')[0] : ''}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5">
            Organiza tu tiempo. No olvides lo importante.
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl px-4 py-2.5 self-start sm:self-auto shadow-xs">
          <strong className="block text-xs sm:text-sm font-extrabold text-[var(--text)] capitalize">
            {todayDateStr}
          </strong>
          <span className="text-[11px] text-[var(--muted)] font-medium">
            Agenda personal sincronizada
          </span>
        </div>
      </section>

      {/* Quick Add Bar */}
      <QuickAdd onOpenFullModal={handleOpenNew} />

      {/* Real Stats Grid */}
      <StatsCards />

      {/* Main Reminders Panel */}
      <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden mt-6">
        {/* Panel Head */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {filterTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filter === t.id
                    ? 'bg-[var(--site-secondary)] text-[var(--site-on-secondary)] font-extrabold shadow-xs'
                    : 'text-[var(--muted)] hover:text-[var(--text)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => clearCompleted()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] text-xs font-bold text-[var(--muted)] hover:text-red-500 hover:bg-[var(--surface-soft)] transition-colors"
              title="Limpiar completados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar completados</span>
            </button>

            <button
              onClick={handleOpenNew}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold shadow-sm shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="p-4 sm:p-5 space-y-2.5">
          {reminders.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted)] space-y-2">
              <div className="text-3xl font-bold">✦</div>
              <p className="text-sm font-semibold">No hay recordatorios en esta vista.</p>
              <p className="text-xs">¡Escribe arriba lo que necesitas recordar para agregarlo en segundos!</p>
            </div>
          ) : (
            reminders.map((r) => (
              <ReminderItem key={r.id} reminder={r} onEdit={handleEdit} />
            ))
          )}
        </div>
      </section>

      {/* Add / Edit Modal */}
      <ReminderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reminderToEdit={selectedReminder}
      />
    </div>
  );
};
