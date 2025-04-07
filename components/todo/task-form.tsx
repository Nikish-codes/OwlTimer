"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Todo } from "@/types/todo"

type Priority = "low" | "medium" | "high"

interface TaskFormProps {
  onSubmit: (task: Omit<Todo, "id" | "userId" | "createdAt">) => void
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [text, setText] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [priority, setPriority] = useState<Priority>('low')
  const [subject, setSubject] = useState('Physics')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      text,
      dueDate: dueDate?.toISOString() ?? "",
      priority,
      subject,
      completed: false,
      completedAt: null,
      subtasks: []
    })
    setText('')
    setDueDate(undefined)
    setPriority('low')
    setSubject('Physics')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task">Task</Label>
        <Input
          id="task"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Select Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={(date: Date | undefined) => setDueDate(date)}
            />
          </PopoverContent>
        </Popover>
        <Select
          value={priority} 
          onValueChange={(value) => setPriority(value as Priority)}
        >
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
            <SelectItem value="Physics">Physics</SelectItem>
            <SelectItem value="Chemistry">Chemistry</SelectItem>
            <SelectItem value="Mathematics">Mathematics</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit">Add Task</Button>
    </form>
  )
}

export default TaskForm 