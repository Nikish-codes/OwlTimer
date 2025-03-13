import { Todo } from '@/types/todo'
import { addDays, addWeeks, addMonths, isBefore, startOfDay } from 'date-fns'

export function generateRecurringInstances(tasks: Todo[], startDate: Date, endDate: Date): Omit<Todo, 'id'>[] {
  const instances: Omit<Todo, 'id'>[] = []

  tasks.forEach(task => {
    if (!task.recurring || !task.dueDate) return

    const pattern = task.recurring
    let currentDate = new Date(task.dueDate)

    while (currentDate <= endDate) {
      if (currentDate >= startDate) {
        const { id, recurring, ...taskWithoutIdAndRecurring } = task
        instances.push({
          ...taskWithoutIdAndRecurring,
          dueDate: currentDate.toISOString()
        })
      }

      // Move to next occurrence
      switch (pattern.frequency) {
        case 'daily':
          currentDate = addDays(currentDate, pattern.interval)
          break
        case 'weekly':
          currentDate = addWeeks(currentDate, pattern.interval)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, pattern.interval)
          break
      }
    }
  })

  return instances.sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })
}
