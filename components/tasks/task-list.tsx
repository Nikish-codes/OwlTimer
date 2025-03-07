"use client"

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Todo } from '@/types/todo'
import { TaskItem } from './task-item'
import { Badge } from "@/components/ui/badge"

interface TaskListProps {
  tasks: Todo[]
  onToggleComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
}

type SortOption = 'priority' | 'dueDate' | 'created'

export function TaskList({ tasks, onToggleComplete, onDelete }: TaskListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('dueDate')
  const [date, setDate] = useState<Date>()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sortTasks = (tasks: Todo[]) => {
    return [...tasks].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'dueDate':
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })
  }

  const todayTasks = sortTasks(tasks.filter(task => {
    if (!task.dueDate) return false
    const taskDate = new Date(task.dueDate)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate.getTime() === today.getTime()
  }))

  const upcomingTasks = sortTasks(tasks.filter(task => {
    if (!task.dueDate) return false
    const taskDate = new Date(task.dueDate)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate.getTime() > today.getTime()
  }))

  return (
    <Card className="w-full bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <CardTitle className="text-2xl font-bold">Tasks</CardTitle>
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Filter by date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                value={date || undefined}
                onChange={(date: Date | null) => setDate(date || undefined)}
              />
            </PopoverContent>
          </Popover>

          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-[150px] bg-card text-foreground border">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-card border shadow-md">
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="created">Created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted rounded-lg p-1">
            <TabsTrigger 
              value="today"
              className="data-[state=active]:bg-background rounded-md transition-all data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="font-medium">Today</span>
                <Badge variant="secondary" className="bg-primary/10">
                  {todayTasks.length}
                </Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming"
              className="data-[state=active]:bg-background rounded-md transition-all data-[state=active]:shadow-sm"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="font-medium">Upcoming</span>
                <Badge variant="secondary" className="bg-primary/10">
                  {upcomingTasks.length}
                </Badge>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6 space-y-4">
            {todayTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
                <p className="text-lg font-medium text-foreground">No tasks for today</p>
                <p className="text-sm text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            ) : (
              todayTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
                <p className="text-lg font-medium text-foreground">No upcoming tasks</p>
                <p className="text-sm text-muted-foreground mt-1">Your schedule is clear</p>
              </div>
            ) : (
              upcomingTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 