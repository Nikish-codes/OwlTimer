import { Todo } from './todo'
import { CalendarEvent } from './event'

export interface OfflineData {
  todos: Todo[]
  studyTime: Record<string, number>
  events: CalendarEvent[]
  lastSynced?: Date
} 