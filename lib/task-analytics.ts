import { Todo } from '@/types/todo'
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, subDays, differenceInDays } from 'date-fns'

export interface TaskStats {
  totalTasks: number
  completedTasks: number
  completionRate: number
  overdueTasks: number
  averageCompletionTime: number // in days
  tasksByPriority: Record<string, number>
  tasksBySubject: Record<string, number>
  weeklyCompletion: {
    date: Date
    completed: number
    total: number
  }[]
  streakCount: number
}

export function calculateTaskStats(tasks: Todo[]): TaskStats {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const overdueTasks = tasks.filter(t => 
    t.dueDate && 
    !t.completed && 
    new Date(t.dueDate) < new Date()
  ).length

  // Calculate completion time for completed tasks
  const completionTimes = tasks
    .filter(t => t.completed && t.dueDate)
    .map(t => {
      const dueDate = new Date(t.dueDate!)
      const completedDate = new Date(t.completedAt!)
      return Math.max(0, differenceInDays(completedDate, dueDate))
    })

  const averageCompletionTime = completionTimes.length
    ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
    : 0

  // Tasks by priority
  const tasksByPriority = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Tasks by subject
  const tasksBySubject = tasks.reduce((acc, task) => {
    acc[task.subject] = (acc[task.subject] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Weekly completion stats
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = endOfWeek(now)
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const weeklyCompletion = daysInWeek.map(date => ({
    date,
    completed: tasks.filter(t => t.completed && isSameDay(new Date(t.completedAt!), date)).length,
    total: tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date)).length
  }))

  // Calculate streak
  let streakCount = 0
  let currentDate = new Date()
  let hasCompletedToday = false

  while (true) {
    const tasksForDay = tasks.filter(t => 
      t.completed && 
      t.completedAt && 
      isSameDay(new Date(t.completedAt), currentDate)
    )

    if (tasksForDay.length > 0) {
      streakCount++
      if (!hasCompletedToday) hasCompletedToday = true
      currentDate = subDays(currentDate, 1)
    } else {
      if (!hasCompletedToday) streakCount = 0
      break
    }
  }

  return {
    totalTasks,
    completedTasks,
    completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
    overdueTasks,
    averageCompletionTime,
    tasksByPriority,
    tasksBySubject,
    weeklyCompletion,
    streakCount
  }
} 