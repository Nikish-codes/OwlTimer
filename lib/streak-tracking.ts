import { StudyDay } from '@/types/study'
import { StudySession } from '@/types/study-session'
import { Timestamp } from 'firebase/firestore'

export function calculateStreaks(studySessions: any[]): { currentStreak: number, streaks: { startDate: Date, endDate: Date, count: number }[] } {
  if (!studySessions || studySessions.length === 0) {
    return { currentStreak: 0, streaks: [] };
  }

  // Sort study sessions by timestamp
  const sortedSessions = [...studySessions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let streaks: { startDate: Date, endDate: Date, count: number }[] = [];
  let currentStreak = 0;
  let currentStreakStart: Date | null = null;
  let previousDate: Date | null = null;

  for (const session of sortedSessions) {
    const sessionDate = new Date(session.timestamp);
    
    if (!previousDate) {
      currentStreakStart = sessionDate;
      currentStreak = 1;
    } else {
      const diffInDays = Math.round((sessionDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffInDays === 1) {
        currentStreak++;
      } else if (diffInDays > 1) {
        if (currentStreakStart) {
          streaks.push({
            startDate: currentStreakStart,
            endDate: previousDate,
            count: currentStreak
          });
        }
        currentStreakStart = sessionDate;
        currentStreak = 1;
      }
    }
    previousDate = sessionDate;
  }

  if (currentStreakStart && currentStreak > 0) {
    streaks.push({
      startDate: currentStreakStart,
      endDate: previousDate!,
      count: currentStreak
    });
  }

  return { currentStreak, streaks };
}

export function getStreakForDate(streaks: { startDate: Date; endDate: Date; count: number }[], date: Date) {
  for (const streak of streaks) {
    if (date >= streak.startDate && date <= streak.endDate) {
      return streak.count
    }
  }
  return 0
} 