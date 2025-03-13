"use client"

import { format, isSameDay } from 'date-fns'
import { cn } from "@/lib/utils"
import { CalendarEvent } from '@/types/event'
import { Todo } from '@/types/todo'
import { TaskStatus } from './task-status'
import { StreakHighlight } from './streak-highlight'

interface DayCellProps {
  date: Date
  events: CalendarEvent[]
  tasks: Todo[]
  studyTime: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  onClick: () => void
  isStreakDay: boolean
  streakCount?: number
}

export function DayCell({
  date,
  events,
  tasks,
  studyTime,
  isCurrentMonth,
  isToday,
  isSelected,
  onClick,
  isStreakDay,
  streakCount
}: DayCellProps) {
  const hasHighPriorityTask = tasks.some(t => t.priority === 'high' && !t.completed)
  const hasExam = events.some(e => e.type === 'exam')
  const hasDeadline = events.some(e => e.type === 'deadline')

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative h-24 p-2 flex flex-col gap-1 border rounded-lg transition-colors",
        !isCurrentMonth && "opacity-50",
        isToday && "border-2 border-primary ring-2 ring-primary/20",
        isSelected && "bg-accent",
        isStreakDay && "streak-day border-orange-500",
        "hover:bg-accent/50 cursor-pointer"
      )}
    >
      {isStreakDay && streakCount !== undefined && (
        <StreakHighlight
          currentStreak={streakCount}
          longestStreak={streakCount}
          streakDates={[date]}
          compact
        />
      )}
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-sm font-medium",
          isToday && "text-primary"
        )}>
          {format(date, 'd')}
        </span>
        {studyTime > 0 && (
          <span className="text-xs text-muted-foreground">
            {Math.floor(studyTime / 60)}h {studyTime % 60}m
          </span>
        )}
      </div>

      <TaskStatus tasks={tasks} compact={true} />

      <div className="flex gap-1">
        {events.map(event => (
          <div
            key={event.id}
            className={cn(
              "w-2 h-2 rounded-full",
              event.type === 'study' && "bg-blue-500",
              event.type === 'exam' && "bg-purple-500",
              event.type === 'deadline' && "bg-yellow-500"
            )}
          />
        ))}
      </div>
    </div>
  )
} 
