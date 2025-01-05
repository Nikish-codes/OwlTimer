import { Todo } from "@/types/todo"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaskItemProps {
  task: Todo
  onUpdate: (taskId: string, updates: Partial<Todo>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(task.text)
  const [dueDate, setDueDate] = useState<Date | undefined>(task.dueDate ? new Date(task.dueDate) : undefined)
  const [priority, setPriority] = useState(task.priority)
  const [subject, setSubject] = useState(task.subject)

  const handleCheckboxChange = async (checked: boolean) => {
    try {
      await onUpdate(task.id, { completed: checked, completedAt: checked ? new Date().toISOString() : null })
      toast({
        title: "Success",
        description: `Task ${checked ? 'completed' : 'uncompleted'}`,
      })
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      })
    }
  }

  const handleTaskDelete = async () => {
    try {
      await onDelete(task.id)
      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
      })
    }
  }

  const handleTaskEdit = async () => {
    setIsEditing(true)
  }

  const handleTaskSave = async () => {
    try {
      await onUpdate(task.id, { text, dueDate: dueDate?.toISOString(), priority, subject })
      toast({
        title: "Success",
        description: "Task updated successfully",
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive"
      })
    }
  }

  const handleTaskCancel = () => {
    setIsEditing(false)
    setText(task.text)
    setDueDate(task.dueDate ? new Date(task.dueDate) : undefined)
    setPriority(task.priority)
    setSubject(task.subject)
  }

  return (
    <div className="flex items-center justify-between p-2 rounded-md border">
      <div className="flex items-center gap-2">
        <Checkbox
          id={task.id}
          checked={task.completed}
          onCheckedChange={handleCheckboxChange}
        />
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Select Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    value={dueDate || undefined}
                    onChange={(date: Date | null) => setDueDate(date || undefined)}
                  />
                </PopoverContent>
              </Popover>
              <Select onValueChange={(value: Todo["priority"]) => setPriority(value)} value={priority}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={(value) => setSubject(value)} value={subject}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="math">Math</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="history">History</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleTaskSave}>Save</Button>
              <Button size="sm" variant="secondary" onClick={handleTaskCancel}>Cancel</Button>
            </div>
          </div>
        ) : (
          <span className={cn(task.completed ? "line-through text-muted-foreground" : "")}>
            {task.text}
          </span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleTaskEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={handleTaskDelete}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 