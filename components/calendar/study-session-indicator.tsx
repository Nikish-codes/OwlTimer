"use client"

import { Timer, Brain, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

type SessionType = 'study' | 'mock_test' | 'pomodoro' | 'focus'

interface StudySession {
  type: SessionType
  duration: number
  subject: string
}

interface StudySessionIndicatorProps {
  session: StudySession
  className?: string
}

export function StudySessionIndicator({ session, className }: StudySessionIndicatorProps) {
  const getSessionIcon = () => {
    switch (session.type) {
      case 'pomodoro':
        return Timer
      case 'focus':
        return Brain
      case 'mock_test':
        return GraduationCap
      case 'study':
      default:
        return Brain
    }
  }

  const Icon = getSessionIcon()

  return (
    <div className={cn(
      "flex items-center gap-1 text-xs",
      session.type === 'mock_test' ? "text-purple-500" :
      session.type === 'pomodoro' ? "text-blue-500" :
      session.type === 'focus' ? "text-green-500" :
      "text-blue-500",
      className
    )}>
      <Icon className="h-3 w-3" />
      <span>{Math.round(session.duration)} min</span>
    </div>
  )
} 