"use client"

import { format, addDays, startOfWeek, isToday, isSameDay } from 'date-fns'
import { cn } from "@/lib/utils"
import { StudySession } from '@/types/study-session'
import { Todo } from '@/types/todo'
import { CalendarEvent } from '@/types/event'
import { EventIndicator } from './event-indicator'

interface WeekViewProps {
  currentDate: Date
  studySessions: StudySession[]
  tasks: Todo[]
  events: CalendarEvent[]
  onSelectDate: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

export function WeekView({ currentDate, studySessions, tasks, events, onSelectDate, onEventClick }: WeekViewProps) {
  const startDate = startOfWeek(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map(date => (
          <div
            key={date.toISOString()}
            className="border-r border-border last:border-r-0"
          >
            <div className="sticky top-0 bg-background p-2 text-center border-b border-border">
              <div className="text-sm font-medium">
                {format(date, 'EEE')}
              </div>
              <div className={cn(
                "text-xs",
                isToday(date) ? "text-primary font-bold" : "text-muted-foreground"
              )}>
                {format(date, 'd MMM')}
              </div>
            </div>
            
            <div className="divide-y divide-border">
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className={cn(
                    "h-12 relative group transition-colors",
                    "hover:bg-accent/50 cursor-pointer"
                  )}
                  onClick={() => {
                    const newDate = new Date(date)
                    newDate.setHours(hour)
                    onSelectDate(newDate)
                  }}
                >
                  <span className="absolute -left-[30px] top-0 text-xs text-muted-foreground">
                    {format(new Date().setHours(hour), 'ha')}
                  </span>
                  {/* Add event display here */}
                  {events
                    .filter(event => {
                      const eventDate = new Date(event.startTime)
                      return isSameDay(eventDate, date) && eventDate.getHours() === hour
                    })
                    .map(event => (
                      <EventIndicator
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 
