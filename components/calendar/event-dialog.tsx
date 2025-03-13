"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CalendarEvent, EventType, RecurringPattern } from '@/types/event'
import { format } from 'date-fns'
import { ReminderSettings } from '../notifications/reminder-settings'
import { scheduleNotification } from '@/lib/notifications'
import { useFirebase } from '@/components/firebase-provider'
import { toast } from "@/components/ui/use-toast"

interface EventDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id'>) => Promise<void>
  event: CalendarEvent | null
  onUpdate: (eventId: string, updates: Partial<CalendarEvent>) => void
  onDelete: (eventId: string) => void
  initialDate: Date | null
}

export function EventDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  event,
  onUpdate,
  onDelete,
  initialDate = new Date() 
}: EventDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<EventType>('other')
  const [startTime, setStartTime] = useState<Date>(new Date())
  const [endTime, setEndTime] = useState<Date>(new Date())
  const [subject, setSubject] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>({
    frequency: 'daily',
    interval: 1
  })
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(5)
  const { user } = useFirebase()

  // Clear form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setType('other')
      setStartTime(new Date())
      setEndTime(new Date())
      setSubject('')
      setIsRecurring(false)
      setRecurringPattern({ frequency: 'daily', interval: 1 })
      setReminderMinutes(5)
    }
  }, [isOpen])

  // Set form values when editing an event
  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setType(event.type)
      setStartTime(new Date(event.startTime))
      setEndTime(event.endTime ? new Date(event.endTime) : new Date())
      setSubject(event.subject || '')
      setIsRecurring(event.isRecurring || false)
      setRecurringPattern(event.recurringPattern || { frequency: 'daily', interval: 1 })
      setReminderMinutes(event.reminderMinutes || 5)
    } else if (initialDate) {
      setStartTime(initialDate)
      setEndTime(initialDate)
    }
  }, [event, initialDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to create events",
        variant: "destructive"
      })
      return
    }
    
    try {
      if (event) {
        const eventData = {
          title,
          description,
          type,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          subject,
          isRecurring,
          recurringPattern: isRecurring ? {
            ...recurringPattern,
            endDate: recurringPattern.endDate
          } : undefined,
          reminderMinutes: reminderMinutes ?? undefined
        }
        await onUpdate(event.id, eventData)
      } else {
        const newEvent = {
          title,
          description,
          type,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          subject,
          isRecurring,
          recurringPattern: isRecurring ? {
            ...recurringPattern,
            endDate: recurringPattern.endDate
          } : undefined,
          reminderMinutes: reminderMinutes ?? undefined,
          userId: user?.uid
        }
        await onSave(newEvent)
      }

      // Schedule reminder if needed
      if (reminderMinutes) {
        const notificationTime = new Date(startTime.getTime() - reminderMinutes * 60000)
        scheduleNotification({
          type: 'event',
          title: `Reminder: ${title}`,
          message: `Your event "${title}" starts in ${reminderMinutes} minutes`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: `/calendar?date=${startTime.toISOString()}`
        }, notificationTime)
      }
      
      toast({
        title: "Success",
        description: "Event created successfully",
      })
      
      onClose()
    } catch (error) {
      console.error('Error creating event:', error)
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Event Type</Label>
            <Select value={type} onValueChange={(value: EventType) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="study">Study Session</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="deadline">Deadline</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'study' && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={format(startTime, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setStartTime(new Date(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={format(endTime, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => setEndTime(new Date(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="recurring">Recurring Event</Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select 
                  value={recurringPattern.frequency} 
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setRecurringPattern({ frequency: value, interval: recurringPattern.interval })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interval</Label>
                <Input
                  type="number"
                  min={1}
                  value={recurringPattern.interval}
                  onChange={(e) => setRecurringPattern({ frequency: recurringPattern.frequency, interval: parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}

          <ReminderSettings
            enabled={reminderMinutes !== null}
            defaultValue={reminderMinutes || 30}
            onSave={setReminderMinutes}
            onDisable={() => setReminderMinutes(null)}
          />

          <div className="flex justify-between gap-2">
            {event && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => onDelete(event.id)}
              >
                Delete Event
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {event ? 'Update' : 'Create'} Event
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 
