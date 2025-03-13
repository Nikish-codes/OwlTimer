import { useState, useEffect } from 'react'
import { Todo } from '@/types/todo'
import { useFirebase } from '@/components/firebase-provider'
import { getTodos, addTodo, updateTodo, deleteTodo } from '@/lib/firebase/todos'
import { generateRecurringInstances } from '@/lib/recurring-tasks'
import { isToday, isBefore, isAfter, startOfDay } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'

export function useTasks() {
  const { user } = useFirebase()
  const [tasks, setTasks] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadTasks()
    }
  }, [user])

  const loadTasks = async () => {
    if (!user) return
    setLoading(true)
    try {
      const todos = await getTodos(user.uid)
      setTasks(todos)
    } catch (error: any) {
      console.error('Error loading tasks:', error)
      toast({
        title: 'Error loading tasks',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const addTask = async (task: Omit<Todo, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return
    try {
      const newTask = { 
        ...task, 
        userId: user.uid, 
        createdAt: new Date().toISOString(),
        synced: true 
      }
      const id = await addTodo(newTask)
      setTasks(prev => [...prev, { ...newTask, id }])

      // Handle recurring tasks
      if (task.recurring && task.dueDate) {
        const taskWithId = { ...newTask, id }
        const recurringInstances = generateRecurringInstances(
          [taskWithId],
          startOfDay(new Date()),
          new Date(new Date().getFullYear() + 1, 0, 1)
        )
        recurringInstances.forEach(async instance => {
          const recurringId = await addTodo({ ...instance, synced: true })
          setTasks(prev => [...prev, { ...instance, id: recurringId }])
        })
      }
    } catch (error: any) {
      console.error('Error adding task:', error)
      toast({
        title: 'Error adding task',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Todo>) => {
    try {
      const updatedTask = {
        ...updates,
        lastModified: new Date().toISOString(),
        synced: true
      }
      await updateTodo(taskId, updatedTask)
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updatedTask } : task
      ))
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      await deleteTodo(taskId)
      setTasks(prev => prev.filter(task => task.id !== taskId))
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast({
        title: 'Error deleting task',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const overdueTasks = tasks.filter(task =>
    task.dueDate &&
    isBefore(startOfDay(new Date(task.dueDate)), startOfDay(new Date())) &&
    !task.completed
  )

  const todaysTasks = tasks.filter(task =>
    task.dueDate &&
    isToday(new Date(task.dueDate)) &&
    !task.completed
  )

  const upcomingTasks = tasks.filter(task =>
    task.dueDate &&
    isAfter(startOfDay(new Date(task.dueDate)), startOfDay(new Date())) &&
    !task.completed
  )

  const completedTasks = tasks.filter(task => task.completed)

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    overdueTasks,
    todaysTasks,
    upcomingTasks,
    completedTasks,
    refresh: loadTasks
  }
} 
