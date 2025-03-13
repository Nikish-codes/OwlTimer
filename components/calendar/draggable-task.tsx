"use client"

import { useDraggable } from '@dnd-kit/core'
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface DraggableTaskProps {
  task: {
    id: string
    text: string
    priority: 'low' | 'medium' | 'high'
    completed: boolean
  }
}

export function DraggableTask({ task }: DraggableTaskProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: task
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "mb-2 p-2 rounded-md border cursor-move",
        task.priority === 'high' ? "bg-red-500/10 border-red-500/20" :
        task.priority === 'medium' ? "bg-yellow-500/10 border-yellow-500/20" :
        "bg-green-500/10 border-green-500/20"
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
  )
} 
