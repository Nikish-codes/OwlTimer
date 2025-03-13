"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns'
import { Clock, CheckCircle, FileText } from 'lucide-react'
import { StudySession } from '@/types/study-session'
import { Todo } from '@/types/todo'

interface DayDetailsProps {
  date: Date
  onClose: () => void
  studySessions: StudySession[]
  tasks: Todo[]
}

export function DayDetails({ date, onClose, studySessions, tasks }: DayDetailsProps) {
  const [showPreview, setShowPreview] = useState(false)
  const totalStudyTime = studySessions.reduce((total, session) => total + session.duration, 0)
  const completedTasks = tasks.filter(t => t.completed).length

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{format(date, 'MMMM d, yyyy')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Study Time */}
          <div>
            <h3 className="font-medium mb-2">Study Time</h3>
            <p>{Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m</p>
          </div>
          {/* Tasks */}
          <div>
            <h3 className="font-medium mb-2">Tasks ({completedTasks}/{tasks.length})</h3>
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-2">
                <span className={task.completed ? "line-through" : ""}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
