"use client"

import { format } from 'date-fns'
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Trash2 } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Todo } from '@/types/todo'
import { cn } from '@/lib/utils'

interface TaskItemProps {
  task: Todo
  onToggleComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
}

export function TaskItem({ task, onToggleComplete, onDelete }: TaskItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggleComplete(task.id)}
        />
        <div>
          <p className={cn("font-medium", task.completed && "line-through text-muted-foreground")}>
            {task.text}
          </p>
          {task.dueDate && (
            <p className="text-sm text-muted-foreground">
              Due: {format(new Date(task.dueDate), 'PPp')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={
          task.priority === 'high' ? 'destructive' :
          task.priority === 'medium' ? 'outline' :
          'secondary'
        }>
          {task.priority}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(task.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 