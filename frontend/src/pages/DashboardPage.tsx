import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useReminders, ReminderItemData } from '../context/ReminderContext';
import { ChatDrawer } from '../components/ChatDrawer';
import { StatsCards } from '../components/StatsCards';
import { QuickAdd } from '../components/QuickAdd';
import { ReminderItem } from '../components/ReminderItem';
import { ReminderModal } from '../components/ReminderModal';
import { NotificationBarPrompt } from '../components/NotificationBarPrompt';
import {
  Sparkles,
  ListTodo,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    reminders,
    filter,
    setFilter,
    clearCompleted,
  } = useReminders();

  // Mode: 'assistant' (default!) or 'agenda'
  const [activeTab, setActiveTab] = useState<'assistant' | 'agenda'>('assistant');
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5">
      {/* Top Header & View Switcher */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-[var(--site-primary)]">
              Asistente Personal Activo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)] mt-0.5">
            {greeting} {user?.name ? user.name.split(' ')[0] : ''}
          </h1>
          <p className="text-xs text-[var(--muted)] capitalize">
            {todayDateStr} · Organiza tu tiempo y no olvides lo importante
          </p>
        </div>

        {/* Intuitive Switcher: Asistente (Chat) vs Agenda Completa */}
        <div className="flex items-center p-1 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'assistant'
                ? 'bg-[var(--site-primary)] text-white shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asistente IA</span>
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'agenda'
                ? 'bg-[var(--site-primary)] text-white shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Mi Agenda</span>
          </button>
        </div>
      </section>

      {/* Android Notification Bar Activation Card */}
      <NotificationBarPrompt />

      {/* VIEW 1: Asistente Conversacional (Chat Siempre Presente) */}
      {activeTab === 'assistant' && (
        <section className="animate-fade-in">
          <ChatDrawer />
        </section>
      )}

      {/* VIEW 2: Vista Detallada de Agenda & Recordatorios */}
      {activeTab === 'agenda' && (
        <section className="space-y-5 animate-fade-in">
          {/* Quick Add Bar */}
          <QuickAdd onOpenFullModal={handleOpenNew} />

          {/* Real Stats Grid */}
          <StatsCards />

          {/* Reminders List Panel */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden">
            {/* Panel Head */}
            <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3">
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

            {/* Tasks list */}
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
          </div>
        </section>
      )}

      {/* Add / Edit Modal */}
      <ReminderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reminderToEdit={selectedReminder}
      />
    </div>
  );
};
