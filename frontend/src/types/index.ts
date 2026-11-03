export type Priority = 'high' | 'medium' | 'low';

export type Category = 
  | 'Personal' 
  | 'Trabajo' 
  | 'Estudio' 
  | 'Salud' 
  | 'Finanzas' 
  | 'Hogar' 
  | 'Otro';

export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24-hour)
  priority: Priority;
  category: Category;
  tags: string[];
  done: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
  recurrence?: Recurrence;
  audioAlert?: boolean;
}

export type FilterType = 'all' | 'today' | 'pending' | 'overdue' | 'high' | 'done';

export type ViewMode = 'list' | 'agenda' | 'calendar' | 'kanban';

export type SortOption = 'dateTime' | 'priority' | 'alphabetical' | 'created';

export interface ReminderStats {
  total: number;
  pending: number;
  today: number;
  done: number;
  highPriority: number;
  overdue: number;
  completionRate: number;
  streakDays: number;
}
