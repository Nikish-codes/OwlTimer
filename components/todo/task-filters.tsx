"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TaskFilters as TaskFiltersType } from '@/lib/task-filters'
import { Todo } from '@/types/todo'

interface TaskFiltersProps {
  tasks: Todo[]
  filters: TaskFiltersType
  onFiltersChange: (filters: TaskFiltersType) => void
}

export function TaskFilters({ tasks, filters, onFiltersChange }: TaskFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value })
  }

  const handlePriorityChange = (priority: 'high' | 'medium' | 'low') => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority]
    onFiltersChange({ ...filters, priorities: newPriorities })
  }

  const handleSubjectChange = (subject: string) => {
    const newSubjects = filters.subjects.includes(subject)
      ? filters.subjects.filter(s => s !== subject)
      : [...filters.subjects, subject]
    onFiltersChange({ ...filters, subjects: newSubjects })
  }

  const handleShowCompletedChange = (checked: boolean) => {
    onFiltersChange({ ...filters, showCompleted: checked })
  }

  const uniqueSubjects = Array.from(new Set(tasks.map(task => task.subject).filter(Boolean)))

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg bg-muted/50">
      <Input
        type="text"
        placeholder="Search tasks..."
        value={filters.search}
        onChange={handleSearchChange}
      />

      <div className="flex gap-2">
        <Select
          value={filters.priorities[0] || ''}
          onValueChange={(value: 'high' | 'medium' | 'low') => 
            onFiltersChange({ ...filters, priorities: [value] })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.subjects[0] || ''}
          onValueChange={(value: string) => onFiltersChange({ ...filters, subjects: [value] })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {uniqueSubjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
            <SelectItem value="">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={filters.showCompleted}
          onCheckedChange={handleShowCompletedChange}
        />
        <label htmlFor="showCompleted" className="text-sm">Show Completed</label>
      </div>
    </div>
  )
} 