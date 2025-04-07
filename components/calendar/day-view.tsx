"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StudySessionIndicator } from './study-session-indicator'
import { format } from 'date-fns'
import { ScrollArea } from '../ui/scroll-area'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { Button } from '../ui/button'
import { Calendar } from 'lucide-react'

interface StudySession {
  id: string
  type: 'study' | 'mock_test' | 'pomodoro' | 'focus'
  duration: number
  subject: string
  timestamp: string
}

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  type: string
}

interface Todo {
  id: string
  text: string
  completed: boolean
  dueDate?: string
  priority: string
}

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
  studySessions = [], 
  tasks = [], 
  events = [], 
  onSelectTime, 
  onAddEvent 
}: DayViewProps) {
  const [isOpen, setIsOpen] = useState(false)

  const totalTime = studySessions.reduce((acc, session: StudySession) => acc + session.duration, 0)
  const sessionsBySubject = studySessions.reduce((acc, session: StudySession) => {
    if (!acc[session.subject]) {
      acc[session.subject] = 0
    }
    acc[session.subject] += session.duration
    return acc
  }, {} as Record<string, number>)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-14 w-14 p-0 hover:bg-muted"
        >
          <div className="flex flex-col items-center justify-center space-y-1">
            <span className="text-sm">{format(date, 'd')}</span>
            {studySessions.length > 0 && (
              <div className="flex -space-x-1">
                {studySessions.slice(0, 3).map((session: StudySession) => (
                  <StudySessionIndicator
                    key={session.id}
                    session={session}
                    className="first:ml-0"
                  />
                ))}
                {studySessions.length > 3 && (
                  <div className="flex h-3 w-3 items-center justify-center rounded-full bg-blue-500/10">
                    <span className="text-[10px] text-blue-500">+{studySessions.length - 3}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(date, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Summary</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2">
                    <div className="text-sm text-muted-foreground">Total Time</div>
                    <div className="text-lg font-bold">
                      {Math.floor(totalTime / 60)}h {totalTime % 60}m
                    </div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="text-sm text-muted-foreground">Sessions</div>
                    <div className="text-lg font-bold">{studySessions.length}</div>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="space-y-2">
                <div className="text-sm font-medium">By Subject</div>
                <div className="space-y-1">
                  {Object.entries(sessionsBySubject).map(([subject, duration]) => (
                    <div key={subject} className="flex justify-between text-sm">
                      <span>{subject}</span>
                      <span className="text-muted-foreground">
                        {Math.floor(duration / 60)}h {duration % 60}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session List */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Sessions</div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {studySessions.map((session: StudySession) => (
                      <StudySessionIndicator
                        key={session.id}
                        session={session}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
} 