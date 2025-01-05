import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaskFormProps {
  onSubmit: (task: { text: string; priority: "low" | "medium" | "high"; subject: string; dueDate: string; completed: boolean; completedAt: string | null; subtasks: any[] }) => void
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [subject, setSubject] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ 
      text: title,
      priority, 
      subject, 
      dueDate: dueDate?.toISOString() ?? "",
      completed: false,
      completedAt: null,
      subtasks: []
    })
    setTitle("")
    setSubject("")
    setDueDate(undefined)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
      <div className="flex gap-4">
        <Input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Select value={priority} onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dueDate?.toISOString().split('T')[0] ?? ""}
          onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : undefined)}
          required
        />
        <Button type="submit">Add Task</Button>
      </div>
    </form>
  )
} 