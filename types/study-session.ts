export type SessionType = 'pomodoro' | 'focus' | 'break'

export interface StudySession {
  id: string
  userId: string
  subject: 'Physics' | 'Chemistry' | 'Mathematics'
  duration: number
  date: string
  timestamp: string
  createdAt: string
  type: 'pomodoro' | 'focus' | 'break'
} 