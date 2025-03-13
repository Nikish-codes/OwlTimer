import { StudySession } from "@/types/study-session"
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, addWeeks, subWeeks } from "date-fns"

export interface StudyStats {
  totalTime: number
  averageSessionLength: number
  totalSessions: number
  subjectBreakdown: Record<string, number>
  typeBreakdown: Record<string, number>
  weeklyProgress: {
    date: string
    minutes: number
  }[]
  bestDay: {
    date: string
    minutes: number
  }
  streakCount: number
}

export function calculateStudyStats(sessions: StudySession[]): StudyStats {
  const totalTime = sessions.reduce((total, session) => total + session.duration, 0)
  const averageSessionLength = sessions.length ? totalTime / sessions.length : 0

  // Calculate subject breakdown
  const subjectBreakdown = sessions.reduce((acc, session) => {
    acc[session.subject] = (acc[session.subject] || 0) + session.duration
    return acc
  }, {} as Record<string, number>)

  // Calculate type breakdown
  const typeBreakdown = sessions.reduce((acc, session) => {
    acc[session.type] = (acc[session.type] || 0) + session.duration
    return acc
  }, {} as Record<string, number>)

  // Calculate weekly progress
  const weeklyProgress = sessions.reduce((acc, session) => {
    const date = new Date(session.date)
    const dateString = date.toISOString()
    const existingDay = acc.find(day => day.date === dateString)
    
    if (existingDay) {
      existingDay.minutes += session.duration
    } else {
      acc.push({ date: dateString, minutes: session.duration })
    }
    
    return acc
  }, [] as { date: string, minutes: number }[])

  // Find best day
  const bestDay = weeklyProgress.reduce((best, current) => {
    if (current.minutes > (best?.minutes || 0)) {
      return current
    }
    return best
  }, { date: new Date().toISOString(), minutes: 0 })

  // Calculate streak
  const streakCount = calculateStreak(sessions)

  return {
    totalTime,
    averageSessionLength,
    totalSessions: sessions.length,
    subjectBreakdown,
    typeBreakdown,
    weeklyProgress,
    bestDay,
    streakCount
  }
}

function calculateStreak(sessions: StudySession[]): number {
  if (!sessions.length) return 0

  const dates = sessions.map(s => new Date(s.date))
  dates.sort((a, b) => b.getTime() - a.getTime())

  let streak = 1
  let currentDate = dates[0]

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(currentDate)
    prevDate.setDate(prevDate.getDate() - 1)

    if (isSameDay(dates[i], prevDate)) {
      streak++
      currentDate = dates[i]
    } else {
      break
    }
  }

  return streak
} 
