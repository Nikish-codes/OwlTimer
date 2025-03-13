"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { X, BookOpen, AlertTriangle } from "lucide-react"
import type { TaskFilters as TaskFiltersType } from "@/lib/task-filters"
import { Todo } from '@/lib/firebase/todos'

// Create a separator component if it doesn't exist
const Separator = ({ className = "" }: { className?: string }) => (
  <div className={`h-px w-full bg-border ${className}`} />
)

interface TaskFiltersProps {
  tasks: Todo[]
  filters: TaskFiltersType
  onFiltersChange: (filters: TaskFiltersType) => void
}

export function TaskFilters({ tasks, filters, onFiltersChange }: TaskFiltersProps) {
  const priorities = ['low', 'medium', 'high'] as const
  const subjects = Array.from(new Set(tasks.map(task => task.subject))).filter(Boolean)

  const [availablePriorities, setAvailablePriorities] = useState<Todo['priority'][]>([])
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([])

  const togglePriority = (priority: typeof priorities[number]) => {
    onFiltersChange({
      ...filters,
      priorities: filters.priorities.includes(priority)
        ? filters.priorities.filter(p => p !== priority)
        : [...filters.priorities, priority]
    })
  }

  const toggleSubject = (subject: string) => {
    onFiltersChange({
      ...filters,
      subjects: filters.subjects.includes(subject)
        ? filters.subjects.filter(s => s !== subject)
        : [...filters.subjects, subject]
    })
  }

  // Extract unique priorities and subjects from tasks
  useEffect(() => {
    const priorities = Array.from(new Set(tasks.map(task => task.priority).filter(Boolean))) as Todo["priority"][]
    const subjects = Array.from(new Set(tasks.map(task => task.subject).filter(Boolean)))
    
    setAvailablePriorities(priorities)
    setAvailableSubjects(subjects)
  }, [tasks])

  const handlePriorityChange = (priority: Todo["priority"]) => {
    const updatedPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority]
    
    onFiltersChange({
      ...filters,
      priorities: updatedPriorities
    })
  }

  const handleSubjectChange = (subject: string) => {
    const updatedSubjects = filters.subjects.includes(subject)
      ? filters.subjects.filter(s => s !== subject)
      : [...filters.subjects, subject]
    
    onFiltersChange({
      ...filters,
      subjects: updatedSubjects
    })
  }

  const handleShowCompletedChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      showCompleted: checked
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      priorities: [],
      subjects: [],
      showCompleted: false
    })
  }

  const hasActiveFilters = filters.priorities.length > 0 || 
    filters.subjects.length > 0 || 
    filters.showCompleted || 
    filters.search.length > 0

  const getPriorityColor = (priority: Todo["priority"]) => {
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

  return (
    <div className="space-y-4">
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {filters.priorities.map(priority => (
          <Badge
            key={priority}
                variant="outline" 
                className={`${getPriorityColor(priority)} flex items-center gap-1 text-xs font-normal`}
              >
                <AlertTriangle className="h-3 w-3" />
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3 w-3 ml-1 p-0" 
                  onClick={() => handlePriorityChange(priority)}
                >
                  <X className="h-2 w-2" />
                  <span className="sr-only">Remove {priority} filter</span>
                </Button>
              </Badge>
            ))}
            
            {filters.subjects.map(subject => (
              <Badge 
                key={subject} 
                variant="outline" 
                className="text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 flex items-center gap-1 text-xs font-normal"
              >
                <BookOpen className="h-3 w-3" />
                {subject}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3 w-3 ml-1 p-0" 
                  onClick={() => handleSubjectChange(subject)}
                >
                  <X className="h-2 w-2" />
                  <span className="sr-only">Remove {subject} filter</span>
                </Button>
              </Badge>
            ))}
            
            {filters.showCompleted && (
              <Badge 
                variant="outline" 
                className="text-purple-500 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/30 flex items-center gap-1 text-xs font-normal"
              >
                Show Completed
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-3 w-3 ml-1 p-0" 
                  onClick={() => handleShowCompletedChange(false)}
                >
                  <X className="h-2 w-2" />
                  <span className="sr-only">Hide completed tasks</span>
                </Button>
              </Badge>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs px-2" 
            onClick={clearFilters}
          >
            Clear All
          </Button>
        </div>
      )}
      
      <div className="space-y-3">
        {availablePriorities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Priority</h4>
            <div className="space-y-2">
              {availablePriorities.map(priority => (
                <div key={priority} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`priority-${priority}`} 
                    checked={filters.priorities.includes(priority)}
                    onCheckedChange={() => handlePriorityChange(priority)}
                  />
                  <Label 
                    htmlFor={`priority-${priority}`}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <Badge 
                      variant="outline" 
                      className={`${getPriorityColor(priority)} flex items-center gap-1 text-xs font-normal`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {availableSubjects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Subject</h4>
            <div className="space-y-2">
              {availableSubjects.map(subject => (
                <div key={subject} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`subject-${subject}`} 
                    checked={filters.subjects.includes(subject)}
                    onCheckedChange={() => handleSubjectChange(subject)}
                  />
                  <Label 
                    htmlFor={`subject-${subject}`}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <Badge 
                      variant="outline" 
                      className="text-blue-500 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 flex items-center gap-1 text-xs font-normal"
                    >
                      <BookOpen className="h-3 w-3" />
                      {subject}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <Separator />

      <div className="flex items-center space-x-2">
        <Checkbox
          id="show-completed"
          checked={filters.showCompleted}
            onCheckedChange={(checked) => handleShowCompletedChange(checked as boolean)}
          />
          <Label 
            htmlFor="show-completed"
            className="text-sm cursor-pointer"
          >
            Show completed tasks
          </Label>
        </div>
      </div>
    </div>
  )
} 
