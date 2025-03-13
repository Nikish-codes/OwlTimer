import { Todo } from '@/lib/firebase/todos'

export interface TaskFilters {
  search: string
  priorities: Todo['priority'][]
  subjects: string[]
  showCompleted: boolean
}

export function filterTasks(tasks: Todo[], filters: TaskFilters): Todo[] {
  return tasks.filter(task => {
    // Search filter
    if (filters.search && !task.text.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }

    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false
    }

    // Subject filter
    if (filters.subjects.length > 0 && !filters.subjects.includes(task.subject)) {
      return false
    }

    // Completed filter
    if (!filters.showCompleted && task.completed) {
      return false
    }

    return true
  })
} 
