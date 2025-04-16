"use client"

import { useState, useEffect } from "react"
import { format, isPast, isToday, isTomorrow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  Edit, 
  MoreHorizontal, 
  Trash2,
  BookOpen,
  AlertTriangle,
  Check
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TaskForm } from "@/components/task-form"
import { Todo } from "@/lib/firebase/todos"

interface TaskItemProps {
  task: Todo
  onUpdate: (taskId: string, updates: Partial<Todo>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isCompleted, setIsCompleted] = useState(task.completed)

  useEffect(() => {
    setIsCompleted(task.completed);
  }, [task.completed]);

  const handleCheckboxChange = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const newCompleted = !isCompleted;
    
    // Update local state immediately
    setIsCompleted(newCompleted);
    
    try {
      // Update the task with completion timestamp
      await onUpdate(task.id, { 
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      // If update fails, revert the local state
      setIsCompleted(!newCompleted);
      console.error("Error updating task completion:", error);
    }
  };

  const handleUpdate = async (updatedFields: Omit<Todo, 'id' | 'userId' | 'createdAt'>) => {
    try {
      await onUpdate(task.id, updatedFields)
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const handleDelete = async () => {
    try {
      await onDelete(task.id)
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30'
      case 'medium':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30'
      case 'low':
        return 'text-green-500 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30'
      default:
        return 'text-slate-500 bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/30'
    }
  }

  const getDueDateDisplay = () => {
    if (!task.dueDate) return null
    
    const dueDate = new Date(task.dueDate)
    let label = format(dueDate, 'MMM d')
    let className = "text-slate-500 bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/30"
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      label = `Overdue: ${label}`
      className = "text-red-500 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30"
    } else if (isToday(dueDate)) {
      label = "Today"
      className = "text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30"
    } else if (isTomorrow(dueDate)) {
      label = "Tomorrow"
      className = "text-purple-500 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30"
    }
    
    return (
      <Badge variant="outline" className={`${className} flex items-center gap-1 text-xs font-normal`}>
        <Calendar className="h-3 w-3" />
        {label}
      </Badge>
    )
  }

  return (
    <>
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${task.completed ? 'bg-muted/30 border-muted' : 'bg-card border-border hover:border-primary/20 hover:bg-accent/5'} transition-colors group`}>
        {/* Improved custom checkbox for better visibility */}
        <div 
          onClick={handleCheckboxChange}
          className={`flex-shrink-0 h-5 w-5 rounded-md border cursor-pointer flex items-center justify-center transition-colors ${
            isCompleted 
              ? 'bg-primary border-primary text-primary-foreground' 
              : 'border-input hover:border-primary hover:bg-primary/10'
          }`}
        >
          {isCompleted && <Check className="h-3.5 w-3.5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {/* Display text field for the task title */}
              {task.text}
            </p>
          </div>
          
          {/* Check for description in a type-safe way */}
          {(task as any).description && (
            <p className={`text-sm text-muted-foreground mt-0.5 line-clamp-1 ${task.completed ? 'line-through opacity-50' : ''}`}>
              {(task as any).description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {task.subject && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30">
                <BookOpen className="h-3 w-3" />
                {task.subject}
              </Badge>
            )}
            
            {task.priority && (
              <Badge variant="outline" className={`flex items-center gap-1 text-xs font-normal ${getPriorityColor(task.priority)}`}>
                <AlertTriangle className="h-3 w-3" />
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </Badge>
            )}
            
            {getDueDateDisplay()}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Make changes to your task here.
            </p>
          </DialogHeader>
          <TaskForm 
            initialValues={task}
            onSubmit={handleUpdate}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 
