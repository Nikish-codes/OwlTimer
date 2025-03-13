"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { cn } from "@/lib/utils"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { Todo } from '@/types/todo'
import { StudySession } from '@/types/study-session'
import { CalendarEvent } from '@/types/event'
import { useFirebase } from '@/components/firebase-provider'
import { StudyDay } from '@/types/study'
import { signIn } from '@/lib/auth'
import { useStudySessions } from '@/hooks/use-study-sessions'
import { useEvents } from '@/hooks/use-events'

// Import local components
import { DayDetails } from './day-details'
import { WeekView } from './week-view'
import { DayView } from './day-view'
import { DroppableCell } from './droppable-cell'
import { DraggableTask } from './draggable-task'
import { calculateStreaks, getStreakForDate } from '@/lib/streak-tracking'
import { StreakIndicator } from "./streak-indicator"
import { EventDialog } from './event-dialog'
import { EventIndicator } from './event-indicator'
import { getEvents, addEvent, updateEvent, deleteEvent } from '@/lib/firebase/events'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DayDetailsDialog } from './day-details-dialog'

interface CalendarViewProps {
  studySessions: StudySession[]
  tasks: Todo[]
  events: CalendarEvent[]
  onUpdateTask: (taskId: string, updates: Partial<Todo>) => Promise<void>
  onAddTask: (task: Omit<Todo, 'id'>) => Promise<void>
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>
  onUpdateEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>
  onDeleteEvent: (eventId: string) => Promise<void>
}

type ViewMode = 'month' | 'week' | 'day'

export function CalendarView({
  studySessions,
  tasks,
  events,
  onUpdateTask,
  onAddTask,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}: CalendarViewProps) {
  const { user } = useFirebase()
  const { loading: studySessionsLoading } = useStudySessions()
  const { loading: eventsLoading, refreshEvents } = useEvents()
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentDay, setCurrentDay] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false)
  const [selectedDayForDetails, setSelectedDayForDetails] = useState<Date | null>(null)

  const handleEventDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active) {
      const draggedEventId = active.id as string
      const targetDate = over.data.current?.date as Date

      if (targetDate) {
        const updatedEvent: Partial<CalendarEvent> = {
          startTime: targetDate.toISOString(),
        }
        onUpdateEvent(draggedEventId, updatedEvent)
          .catch(error => console.error("Error updating event: ", error))
      }
    }
  }

  const handleEventUpdate = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      await onUpdateEvent(eventId, updates)
      await refreshEvents()
      setIsEventDialogOpen(false)
    } catch (error) {
      console.error("Error updating event: ", error)
    }
  }

  const handleEventDelete = async (eventId: string) => {
    try {
      await onDeleteEvent(eventId)
      await refreshEvents()
      setIsEventDialogOpen(false)
    } catch (error) {
      console.error("Error deleting event: ", error)
    }
  }

  const handleAddEvent = async (newEvent: Omit<CalendarEvent, 'id'>) => {
    if (!user) {
      signIn()
      return
    }

    try {
      await onAddEvent(newEvent)
      setIsEventDialogOpen(false)
      await refreshEvents()
    } catch (error) {
      console.error("Error adding event:", error)
    }
  }

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  })

  const daysInWeek = eachDayOfInterval({
    start: startOfWeek(currentWeek),
    end: endOfWeek(currentWeek)
  })

  const streaksData = studySessions ? calculateStreaks(studySessions) : { currentStreak: 0, streaks: [] }
  const { streaks } = streaksData

  const handleDateClick = (date: Date) => {
    if (isEventDialogOpen) return
    
    setSelectedDayForDetails(date)
    setIsDayDetailsOpen(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedDate(new Date(event.startTime))
    setSelectedEvent(event)
    setIsEventDialogOpen(true)
  }

  const handleTodayClick = () => {
    const today = new Date()
    setCurrentMonth(today)
    setCurrentWeek(today)
    setCurrentDay(today)
    setSelectedDate(today)
    setSelectedDayForDetails(today)
    setIsDayDetailsOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {viewMode === 'month' && format(currentMonth, 'MMMM yyyy')}
            {viewMode === 'week' && `Week of ${format(currentWeek, 'MMMM dd, yyyy')}`}
            {viewMode === 'day' && format(currentDay, 'MMMM dd, yyyy')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTodayClick}>
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentMonth(subMonths(currentMonth, 1))
                } else if (viewMode === 'week') {
                  setCurrentWeek(subMonths(currentWeek, 1))
                } else {
                  setCurrentDay(subMonths(currentDay, 1))
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentMonth(addMonths(currentMonth, 1))
                } else if (viewMode === 'week') {
                  setCurrentWeek(addMonths(currentWeek, 1))
                } else {
                  setCurrentDay(addMonths(currentDay, 1))
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEventDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
            <Select onValueChange={(value: ViewMode) => setViewMode(value)} value={viewMode}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext onDragEnd={handleEventDragEnd}>
          {viewMode === 'month' && (
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-sm font-medium text-center p-2">
                  {day}
                </div>
              ))}
              
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, index) => (
                <div key={`empty-${index}`} className="p-2 h-24 border rounded-md bg-muted text-muted-foreground" />
              ))}
              
              {daysInMonth.map(day => (
                <DroppableCell key={day.toISOString()} date={day}>
                  <div
                    className={cn(
                      "flex flex-col p-2 h-24 border rounded-md cursor-pointer transition-colors",
                      "hover:bg-accent hover:border-accent",
                      isSameMonth(day, currentMonth) 
                        ? 'bg-card text-card-foreground' 
                        : 'bg-muted text-muted-foreground',
                      isToday(day) && 'ring-2 ring-primary',
                      selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-secondary',
                      "relative group"
                    )}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "text-sm font-medium",
                        isToday(day) && "text-primary font-bold"
                      )}>
                        {format(day, 'd')}
                      </span>
                      <StreakIndicator count={getStreakForDate(streaks, day) || 0} />
                    </div>
                    <div className="flex flex-col gap-1 mt-1 overflow-hidden">
                      {eventsLoading ? (
                        <div className="text-xs text-muted-foreground">Loading...</div>
                      ) : events.filter(event => isSameDay(new Date(event.startTime), day)).length === 0 ? (
                        <div className="text-xs text-muted-foreground">No events</div>
                      ) : (
                        events
                          .filter(event => isSameDay(new Date(event.startTime), day))
                          .map(event => (
                            <EventIndicator 
                              key={event.id} 
                              event={event} 
                              compact
                              onClick={() => handleEventClick(event)}
                            />
                          ))
                      )}
                    </div>
                  </div>
                </DroppableCell>
              ))}
            </div>
          )}

          {viewMode === 'week' && (
            <WeekView
              currentDate={currentWeek}
              events={events}
              onEventClick={handleEventClick}
              onSelectDate={handleDateClick}
              studySessions={studySessions || []}
              tasks={tasks}
            />
          )}

          {viewMode === 'day' && (
            <DayView
              date={currentDay}
              events={events}
              onSelectTime={handleDateClick}
              onAddEvent={() => setIsEventDialogOpen(true)}
              studySessions={studySessions || []}
              tasks={tasks}
            />
          )}
        </DndContext>

        <EventDialog
          isOpen={isEventDialogOpen}
          onClose={() => {
            setIsEventDialogOpen(false)
            setSelectedEvent(null)
          }}
          onSave={handleAddEvent}
          event={selectedEvent}
          onUpdate={handleEventUpdate}
          onDelete={handleEventDelete}
          initialDate={selectedDate}
        />

        <DayDetailsDialog
          isOpen={isDayDetailsOpen}
          onClose={() => {
            setIsDayDetailsOpen(false)
            setSelectedDayForDetails(null)
          }}
          date={selectedDayForDetails || new Date()}
          events={events}
          onAddEvent={() => {
            setIsEventDialogOpen(true)
            setIsDayDetailsOpen(false)
          }}
          onEventClick={(event) => {
            setSelectedEvent(event)
            setIsEventDialogOpen(true)
            setIsDayDetailsOpen(false)
          }}
          onEditEvent={(event) => {
            setSelectedEvent(event)
            setIsEventDialogOpen(true)
            setIsDayDetailsOpen(false)
          }}
          onDeleteEvent={handleEventDelete}
        />
      </CardContent>
    </Card>
  )
}
