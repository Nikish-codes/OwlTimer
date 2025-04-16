"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Task } from "@/hooks/use-local-tasks"
import { toast } from "@/components/ui/use-toast"

interface TaskFormProps {
  initialValues?: Partial<Task>
  onSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void
  submitLabel?: string
}

export function TaskForm({ initialValues, onSubmit, submitLabel = "Add Task" }: TaskFormProps) {
  const [text, setText] = useState(initialValues?.text || "")
  const [priority, setPriority] = useState<"low" | "medium" | "high">(initialValues?.priority || "medium")
  const [subject, setSubject] = useState(initialValues?.subject || "")
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialValues?.dueDate ? new Date(initialValues.dueDate) : new Date()
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subtasks, setSubtasks] = useState<{ id: string; text: string; completed: boolean }[]>(
    initialValues?.subtasks?.map(st => ({
      id: st.id,
      text: st.text,
      completed: st.completed
    })) || [{ id: Date.now().toString(), text: '', completed: false }]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return

    try {
      setIsSubmitting(true)
      const newTask = {
        text: text.trim(),
        subject: subject || 'General',
        priority: priority || 'medium',
        dueDate: dueDate ? dueDate.toISOString() : null,
        completed: initialValues?.completed || false,
        completedAt: initialValues?.completedAt || null,
        subtasks: subtasks.filter(st => st.text.trim()).map(st => ({
          id: st.id,
          text: st.text.trim(),
          completed: false
        })),
        updatedAt: new Date().toISOString(),
        userId: initialValues?.userId || 'local-user'
      }

      await onSubmit(newTask)
      setText('')
      setSubject('')
      setPriority('medium')
      setDueDate(undefined)
      setSubtasks([{ id: Date.now().toString(), text: '', completed: false }])
    } catch (error) {
      console.error('Error submitting task:', error)
      toast({
        title: "Error",
        description: "Failed to add task. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-card rounded-lg border shadow-sm">
      <div className="space-y-4">
        <Input
          placeholder="What needs to be done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full text-lg"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
                weekStartsOn={1}
                fromDate={new Date()}
              />
            </PopoverContent>
          </Popover>
          
          <Select value={priority} onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Physics">Physics</SelectItem>
              <SelectItem value="Chemistry">Chemistry</SelectItem>
              <SelectItem value="Mathematics">Mathematics</SelectItem>
              <SelectItem value="Biology">Biology</SelectItem>
              <SelectItem value="History">History</SelectItem>
              <SelectItem value="Geography">Geography</SelectItem>
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Computer Science">Computer Science</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end pt-4 border-t">
        <Button 
          type="submit" 
          disabled={isSubmitting || !text.trim()}
          className="w-full sm:w-auto min-w-[120px]"
          size="lg"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  )
}
