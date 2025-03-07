"use client"

import { useDroppable } from '@dnd-kit/core'
import { cn } from "@/lib/utils"

interface DroppableCellProps {
  date: Date
  children: React.ReactNode
  className?: string
  onClick?: () => void
  isStreakDay?: boolean
  streakCount?: number
}

export function DroppableCell({ date, children, className, onClick, isStreakDay, streakCount }: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: date.toISOString(),
    data: { date }
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        className,
        isOver && "bg-accent",
        "transition-colors"
      )}
    >
      {children}
    </div>
  )
} 