import { isSameDay, isYesterday, subDays } from 'date-fns'

export interface StudyDay {
  date: Date
  totalTime: number  // in minutes
}

export function calculateStreak(studyDays: StudyDay[]): {
  currentStreak: number
  longestStreak: number
  streakDates: string[]
} {
  if (!studyDays.length) return { currentStreak: 0, longestStreak: 0, streakDates: [] }

  // Sort study days by date
  const sortedDays = [...studyDays].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  let currentStreak = 0
  let longestStreak = 0
  let streakDates: string[] = []
  let currentDate = new Date()

  // Calculate current streak
  for (let i = 0; i < sortedDays.length; i++) {
    const studyDay = sortedDays[i]
    const studyDate = new Date(studyDay.date)
    
    if (i === 0) {
      // First day must be today or yesterday to count
      if (isSameDay(studyDate, currentDate) || 
          isYesterday(studyDate)) {
        currentStreak = 1
        streakDates.push(studyDate.toISOString())
      } else {
        break
      }
    } else {
      // Check if this day is consecutive
      const prevDate = new Date(sortedDays[i-1].date)
      const expectedDate = subDays(prevDate, 1)
      if (isSameDay(studyDate, expectedDate)) {
        currentStreak++
        streakDates.push(studyDate.toISOString())
      } else {
        break
      }
    }
  }

  // Calculate longest streak
  let tempStreak = 1
  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = new Date(sortedDays[i-1].date)
    const expectedDate = subDays(prevDate, 1)
    const currentDate = new Date(sortedDays[i].date)
    if (isSameDay(currentDate, expectedDate)) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    streakDates
  }
} 