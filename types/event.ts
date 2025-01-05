export type EventType = 'study' | 'exam' | 'deadline' | 'other';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  startTime: string;
  endTime?: string;
  type: EventType;
  subject?: string;
  description?: string;
  lastModified?: string;
  synced?: boolean;
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  };
  reminderMinutes?: number;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  endDate?: string
} 