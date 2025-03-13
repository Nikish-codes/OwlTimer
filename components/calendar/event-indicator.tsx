"use client"

import { CalendarEvent } from "@/types/event"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface EventIndicatorProps {
  event: CalendarEvent
  compact?: boolean
  onClick?: () => void
}

export function EventIndicator({ event, compact = false, onClick }: EventIndicatorProps) {
  console.log('Rendering event:', event)
  
  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1 p-1 rounded cursor-pointer text-xs w-full",
          event.type === 'study' && "bg-blue-500/20 text-blue-700",
          event.type === 'exam' && "bg-red-500/20 text-red-700",
          event.type === 'deadline' && "bg-yellow-500/20 text-yellow-700",
          event.type === 'other' && "bg-purple-500/20 text-purple-700"
        )} 
        onClick={onClick}
        title={event.title}
      >
        <div className={cn(
          "h-2 w-2 rounded-full",
          event.type === 'study' && "bg-blue-500",
          event.type === 'exam' && "bg-red-500",
          event.type === 'deadline' && "bg-yellow-500",
          event.type === 'other' && "bg-purple-500"
        )} />
        <span className="truncate">{event.title}</span>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "px-2 py-1 rounded-md text-sm cursor-pointer",
        event.type === 'study' && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
        event.type === 'exam' && "bg-red-500/10 text-red-500 border border-red-500/20",
        event.type === 'deadline' && "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20",
        event.type === 'other' && "bg-purple-500/10 text-purple-500 border border-purple-500/20"
      )} 
      onClick={onClick}
    >
      {event.title}
      <div className="text-xs text-muted-foreground">
        {format(new Date(event.startTime), 'h:mm a')}
      </div>
    </div>
  )
} 
