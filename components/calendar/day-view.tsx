"use client"

import { format, addHours, isSameHour, isSameDay } from 'date-fns'
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CalendarEvent } from "@/types/event"
import { EventIndicator } from "./event-indicator"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { StudySessionIndicator } from './study-session-indicator'
import { StudySession } from '@/types/study-session'
import { Todo } from '@/types/todo'
import { ScrollArea } from "@/components/ui/scroll-area"

interface DayViewProps {
  date: Date
  studySessions: StudySession[]
  tasks: Todo[]
  events: CalendarEvent[]
  onSelectTime: (date: Date) => void
  onAddEvent: () => void
}

export function DayView({ 
  date, 
  studySessions, 
  tasks,
  events,
  onSelectTime,
  onAddEvent 
}: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => addHours(new Date(date).setHours(0), i))
  const todayEvents = events.filter(event => isSameDay(new Date(event.startTime), date))
  const todaySessions = studySessions.filter(session => isSameDay(new Date(session.timestamp), date))
  const todayTasks = tasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), date))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {format(date, 'EEEE')}
          </h2>
          <p className="text-muted-foreground">
            {format(date, 'MMMM d, yyyy')}
          </p>
        </div>
        <Button onClick={onAddEvent}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Events</h3>
          <p className="text-2xl font-bold">{todayEvents.length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Study Sessions</h3>
          <p className="text-2xl font-bold">{todaySessions.length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-2">Tasks Due</h3>
          <p className="text-2xl font-bold">{todayTasks.length}</p>
        </div>
      </div>

      {/* Timeline View */}
      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="grid grid-cols-[60px_1fr] gap-4">
          {hours.map(hour => {
            const hourEvents = events.filter(event => 
              isSameHour(new Date(event.startTime), hour)
            )
            
            return (
              <div
                key={hour.toISOString()}
                className="group relative"
              >
                <div className="sticky top-0 text-sm text-muted-foreground">
                  {format(hour, 'h a')}
                </div>
                <div 
                  className="absolute inset-0 -z-10 group-hover:bg-muted/50 cursor-pointer rounded-lg transition-colors"
                  onClick={() => onSelectTime(hour)}
                />
                
                <div className="ml-16 space-y-2">
                  {hourEvents.map(event => (
                    <EventIndicator
                      key={event.id}
                      event={event}
                    />
                  ))}

                  {studySessions
                    .filter(session => isSameHour(new Date(session.timestamp), hour))
                    .map(session => (
                      <StudySessionIndicator
                        key={session.id}
                        session={session}
                        compact={false}
                      />
                    ))}

                  {tasks
                    .filter(task => task.dueDate && isSameHour(new Date(task.dueDate), hour))
                    .map(task => (
                      <div
                        key={task.id}
                        className={cn(
                          "p-2 rounded-md border",
                          task.priority === 'high' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                          task.priority === 'medium' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                          "bg-green-500/10 text-green-500 border-green-500/20"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={task.completed ? "line-through" : ""}>
                            {task.text}
                          </span>
                          <Badge variant="outline">
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
} 