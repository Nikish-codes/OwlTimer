"use client"

import { cn } from "@/lib/utils"
import { Flame, Trophy } from "lucide-react"
import { StreakIndicator } from "./streak-indicator"

interface StreakHighlightProps {
  currentStreak: number
  longestStreak: number
  streakDates: Date[]
  compact?: boolean
}

export function StreakHighlight({ currentStreak, longestStreak, streakDates, compact }: StreakHighlightProps) {
  if (compact) {
    return <StreakIndicator count={currentStreak} />
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-500" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">Current Streak</span>
          <span className="text-2xl font-bold">{currentStreak} days</span>
        </div>
      </div>

      <div className="h-8 w-px bg-border" />

      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-orange-500" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">Longest Streak</span>
          <span className="text-2xl font-bold">{longestStreak} days</span>
        </div>
      </div>
    </div>
  )
} 
