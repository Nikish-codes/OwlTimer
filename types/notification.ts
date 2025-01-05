export type NotificationType = 'task' | 'event' | 'study' | 'streak'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  relatedId?: string
} 