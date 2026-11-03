import React, { useState } from 'react';
import { useReminders, ReminderItemData } from '../context/ReminderContext';
import { ReminderItem } from '../components/ReminderItem';
import { ReminderModal } from '../components/ReminderModal';
import { Plus, Search, Filter, ArrowUpDown } from 'lucide-react';

export const RemindersPage: React.FC = () => {
  const {
    reminders,
    categories,
    filter,
    setFilter,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
  } = useReminders();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItemData | null>(null);

  const handleEdit = (reminder: ReminderItemData) => {
    setSelectedReminder(reminder);
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setSelectedReminder(null);
    setModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">
            Gestión de Recordatorios
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)]">
            Consulta, filtra y organiza tus actividades pendientes
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--site-primary)] text-white text-xs font-extrabold shadow-sm shadow-[var(--site-primary)]/20 hover:brightness-105 active:scale-98 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Crear recordatorio</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, nota o etiqueta..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs sm:text-sm font-medium focus:border-[var(--site-primary)] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-bold text-[var(--text)] outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo pendientes</option>
              <option value="today">Para hoy</option>
              <option value="OVERDUE">Vencidos</option>
              <option value="COMPLETED">Completados</option>
            </select>

            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-xs font-bold text-[var(--text)] outline-none"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {reminders.length === 0 ? (
          <div className="p-12 text-center bg-[var(--surface)] border border-[var(--line)] rounded-2xl text-[var(--muted)]">
            <div className="text-3xl mb-2">✦</div>
            <p className="text-sm font-bold">No se encontraron recordatorios con los filtros actuales.</p>
          </div>
        ) : (
          reminders.map((r) => (
            <ReminderItem key={r.id} reminder={r} onEdit={handleEdit} />
          ))
        )}
      </div>

      <ReminderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reminderToEdit={selectedReminder}
      />
    </div>
  );
};
