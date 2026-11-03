import React, { useState } from 'react';
import { useReminders, ReminderItemData } from '../context/ReminderContext';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalIcon } from 'lucide-react';

interface CalendarViewProps {
  onSelectDateToCreate: (dateStr: string) => void;
  onEditReminder: (reminder: ReminderItemData) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onSelectDateToCreate,
  onEditReminder,
}) => {
  const { reminders } = useReminders();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Build grid
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const todayStr = new Date().toISOString().split('T')[0];

  const calendarDays = [];
  for (let i = 0; i < totalCells; i++) {
    let dayNum: number;
    let dayMonth = month;
    let dayYear = year;
    let isCurrentMonth = true;

    if (i < firstDayIndex) {
      dayNum = daysInPrevMonth - firstDayIndex + i + 1;
      dayMonth = month - 1;
      isCurrentMonth = false;
    } else if (i >= firstDayIndex + daysInMonth) {
      dayNum = i - (firstDayIndex + daysInMonth) + 1;
      dayMonth = month + 1;
      isCurrentMonth = false;
    } else {
      dayNum = i - firstDayIndex + 1;
      isCurrentMonth = true;
    }

    const dObj = new Date(dayYear, dayMonth, dayNum);
    const yStr = dObj.getFullYear();
    const mStr = String(dObj.getMonth() + 1).padStart(2, '0');
    const dStr = String(dObj.getDate()).padStart(2, '0');
    const dateKey = `${yStr}-${mStr}-${dStr}`;

    const dayReminders = reminders.filter((r) => r.date === dateKey);

    calendarDays.push({
      dateKey,
      dayNum,
      isCurrentMonth,
      isToday: dateKey === todayStr,
      reminders: dayReminders,
    });
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xs overflow-hidden">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 border-b border-[var(--line)] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--site-secondary)] text-[var(--site-on-secondary)] flex items-center justify-center font-bold">
            <CalIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-[var(--text)]">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-[var(--muted)]">Vista mensual de actividades programadas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={today}
            className="px-3 py-1.5 rounded-xl border border-[var(--line)] text-xs font-bold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)] transition-colors"
          >
            Hoy
          </button>
          <div className="flex items-center border border-[var(--line)] rounded-xl overflow-hidden bg-[var(--surface)]">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-[var(--line)] bg-[var(--surface-soft)] text-center text-xs font-bold text-[var(--muted)] py-2">
        {dayNames.map((name) => (
          <div key={name}>{name}</div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[var(--line)]">
        {calendarDays.map((cell) => (
          <div
            key={cell.dateKey}
            className={`min-h-[90px] sm:min-h-[115px] p-1.5 sm:p-2 flex flex-col justify-between group transition-colors ${
              cell.isCurrentMonth ? 'bg-[var(--surface)]' : 'bg-[var(--surface-soft)]/40 opacity-40'
            } ${cell.isToday ? 'ring-1 ring-inset ring-[var(--site-primary)] bg-[var(--site-primary)]/[0.02]' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  cell.isToday
                    ? 'bg-[var(--site-primary)] text-white'
                    : 'text-[var(--text)]'
                }`}
              >
                {cell.dayNum}
              </span>

              <button
                type="button"
                onClick={() => onSelectDateToCreate(cell.dateKey)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[var(--muted)] hover:text-[var(--site-primary)] rounded-md transition-opacity"
                title={`Agregar recordatorio el ${cell.dateKey}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of chips */}
            <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[70px] no-scrollbar">
              {cell.reminders.slice(0, 3).map((r) => {
                const isDone = r.status === 'COMPLETED';
                return (
                  <button
                    key={r.id}
                    onClick={() => onEditReminder(r)}
                    className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-bold transition-all block ${
                      isDone
                        ? 'line-through bg-[var(--line)]/50 text-[var(--muted)]'
                        : r.priority === 'HIGH'
                        ? 'bg-red-500/15 text-red-700 dark:text-red-400 font-extrabold'
                        : 'bg-[var(--site-secondary)] text-[var(--site-on-secondary)]'
                    }`}
                    title={`${r.time} · ${r.title}`}
                  >
                    {r.time} {r.title}
                  </button>
                );
              })}
              {cell.reminders.length > 3 && (
                <div className="text-[9px] font-bold text-[var(--muted)] pl-1">
                  +{cell.reminders.length - 3} más
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
