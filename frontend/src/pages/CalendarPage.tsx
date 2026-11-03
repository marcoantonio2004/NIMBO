import React, { useState } from 'react';
import { CalendarView } from '../components/CalendarView';
import { ReminderModal } from '../components/ReminderModal';
import { ReminderItemData } from '../context/ReminderContext';

export const CalendarPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItemData | null>(null);
  const [targetDate, setTargetDate] = useState<string | undefined>(undefined);

  const handleSelectDateToCreate = (dateStr: string) => {
    setSelectedReminder(null);
    setTargetDate(dateStr);
    setModalOpen(true);
  };

  const handleEditReminder = (reminder: ReminderItemData) => {
    setSelectedReminder(reminder);
    setTargetDate(undefined);
    setModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <CalendarView
        onSelectDateToCreate={handleSelectDateToCreate}
        onEditReminder={handleEditReminder}
      />

      <ReminderModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reminderToEdit={selectedReminder}
        initialDate={targetDate}
      />
    </div>
  );
};
