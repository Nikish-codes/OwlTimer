"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format, isSameDay } from "date-fns"
import { CalendarEvent } from "@/types/event"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Plus, Clock, Calendar, FileText, Bell, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DayDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  events: CalendarEvent[]
  onAddEvent: () => void
  onEventClick: (event: CalendarEvent) => void
  onEditEvent: (event: CalendarEvent) => void
  onDeleteEvent: (eventId: string) => void
}

export function DayDetailsDialog({
  isOpen,
  onClose,
  date,
  events,
  onAddEvent,
  onEventClick,
  onEditEvent,
  onDeleteEvent
}: DayDetailsDialogProps) {
  const dayEvents = events.filter(event => isSameDay(new Date(event.startTime), date))

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">
                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={onAddEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] mt-4">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No events scheduled for this day
            </div>
          ) : (
            <div className="space-y-4">
              {dayEvents
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow",
                      event.type === 'study' && "bg-blue-950 text-white border-blue-800",
                      event.type === 'exam' && "bg-red-950 text-white border-red-800",
                      event.type === 'deadline' && "bg-yellow-950 text-white border-yellow-800",
                      event.type === 'other' && "bg-purple-950 text-white border-purple-800"
                    )}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-white">{event.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-white border-white">
                          {event.type}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditEvent(event)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-300 hover:text-red-200 hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to delete this event?')) {
                              onDeleteEvent(event.id)
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    {event.description && (
                      <div className="flex gap-2 text-sm text-gray-200 mb-2">
                        <FileText className="h-4 w-4 flex-shrink-0 mt-1" />
                        <div className="break-words whitespace-pre-wrap">
                          {event.description}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-200">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(event.startTime), 'h:mm a')}
                      </div>
                      {event.endTime && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.endTime), 'h:mm a')}
                        </div>
                      )}
                      {event.subject && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {event.subject}
                        </div>
                      )}
                      {event.reminderMinutes && (
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          {event.reminderMinutes} minutes before
                        </div>
                      )}
                    </div>

                    {event.isRecurring && event.recurringPattern && (
                      <div className="mt-2">
                        <Badge 
                          variant="outline" 
                          className="text-white border-white"
                        >
                          Recurring: {event.recurringPattern.frequency} 
                          {event.recurringPattern.interval > 1 && ` (every ${event.recurringPattern.interval} ${event.recurringPattern.frequency}s)`}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 