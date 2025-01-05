"use client"

import { Todo } from "@/types/todo"
import { cn } from "@/lib/utils"
import { CheckCircle2, AlertCircle, Clock } from "lucide-react"

interface TaskStatusProps {
  tasks: Todo[]
  compact?: boolean
}

export function TaskStatus({ tasks, compact = false }: TaskStatusProps) {
  const overdueTasks = tasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date() && !task.completed
  )
  const completedTasks = tasks.filter(task => task.completed)
  const highPriorityTasks = tasks.filter(task => 
    task.priority === 'high' && !task.completed
  )

  if (compact) {
    return (
      <div className="flex gap-1">
        {overdueTasks.length > 0 && (
          <div className="w-2 h-2 rounded-full bg-red-500" />
        )}
        {highPriorityTasks.length > 0 && (
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
        )}
        {completedTasks.length > 0 && (
          <div className="w-2 h-2 rounded-full bg-green-500" />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {overdueTasks.length > 0 && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <Clock className="h-4 w-4" />
          <span>{overdueTasks.length} overdue</span>
        </div>
      )}
      {highPriorityTasks.length > 0 && (
        <div className="flex items-center gap-2 text-yellow-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{highPriorityTasks.length} high priority</span>
        </div>
      )}
      {completedTasks.length > 0 && (
        <div className="flex items-center gap-2 text-green-500 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>{completedTasks.length} completed</span>
        </div>
      )}
    </div>
  )
} 