import { Todo } from '@/types/todo'

export interface TaskFilters {
  search: string
  priorities: ('high' | 'medium' | 'low')[]
  subjects: string[]
  showCompleted: boolean
}

export function filterTasks(tasks: Todo[], filters: TaskFilters): Todo[] {
  return tasks.filter(task => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesSearch = 
        task.text.toLowerCase().includes(searchLower) ||
        task.subject.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      if (!filters.priorities.includes(task.priority)) {
        return false
      }
    }

    // Subject filter
    if (filters.subjects.length > 0) {
      if (!filters.subjects.includes(task.subject)) {
        return false
      }
    }

    // Completed filter
    if (!filters.showCompleted && task.completed) {
      return false
    }

    return true
  })
} 