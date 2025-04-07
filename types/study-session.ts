export type SessionType = 'study' | 'mock_test'

export interface StudySession {
  id: string
  userId: string
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Mock'
  duration: number
  startTime: Date
  endTime: Date
  timestamp: string
  date: string
  createdAt: string
  type: SessionType
} 