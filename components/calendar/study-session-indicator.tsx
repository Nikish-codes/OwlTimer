"use client"

import { StudySession } from "@/types/study-session"
import { cn } from "@/lib/utils"
import { Timer, Brain, Coffee } from "lucide-react"
import { format } from "date-fns"

interface StudySessionIndicatorProps {
  session: StudySession
  compact?: boolean
}

export function StudySessionIndicator({ session, compact = false }: StudySessionIndicatorProps) {
  const getSessionIcon = () => {
    switch (session.type) {
      case 'pomodoro':
        return Timer
      case 'focus':
        return Brain
      case 'break':
        return Coffee
      default:
        return null
    }
  }

  const Icon = getSessionIcon()

  if (!Icon) return null

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
        <Icon className="h-3 w-3 text-blue-500" />
        <span className="text-xs text-blue-500">
          {session.duration}m
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-blue-500" />
      </div>
      <div>
        <div className="text-sm font-medium text-blue-500">
          {session.subject} - {session.type}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(session.timestamp), 'h:mm a')} • {session.duration} minutes
        </div>
      </div>
    </div>
  )
} 
