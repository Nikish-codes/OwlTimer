import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getTodos, addTodo, updateTodo, deleteTodo, Todo } from '@/lib/firebase/todos'
import { startOfDay, endOfDay, addDays, isBefore, isAfter, isToday } from 'date-fns'
import { toast } from '@/components/ui/use-toast'

export function useFirebaseTasks() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Todo[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks
  useEffect(() => {
    if (!user?.id) {
      setTasks([])
      setLoading(false)
      return
    }

    const loadTasks = async () => {
      try {
        setLoading(true)
        
        // Try to load from local storage first
        const localStorageKey = `tasks_${user.id}`
        const localTasks = localStorage.getItem(localStorageKey)
        let tasksFromStorage: Todo[] = []
        
        if (localTasks) {
          try {
            tasksFromStorage = JSON.parse(localTasks)
            // Set tasks from local storage immediately for faster UI response
            setTasks(tasksFromStorage)
          } catch (e) {
            console.error('Error parsing local tasks:', e)
          }
        }
        
        // Then try to fetch from Firebase
        try {
          const fetchedTasks = await getTodos(user.id)
          setTasks(fetchedTasks)
          
          // Update local storage with the latest data from Firebase
          localStorage.setItem(localStorageKey, JSON.stringify(fetchedTasks))
          setError(null)
        } catch (firebaseErr) {
          console.error('Error loading tasks from Firebase:', firebaseErr)
          
          // If we have local tasks, use them and show a warning
          if (tasksFromStorage.length > 0) {
            toast({
              title: "Using cached tasks",
              description: "Could not connect to the server. Using locally saved tasks.",
              variant: "default"
            })
          } else {
            setError('Failed to load tasks')
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [user?.id])

  // Filter tasks by date ranges
  const today = startOfDay(new Date())
  const tomorrow = endOfDay(addDays(today, 1))

  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.completed) return false
    const dueDate = new Date(task.dueDate)
    return isBefore(dueDate, today)
  })

  const todaysTasks = tasks.filter(task => {
    if (!task.dueDate) return false
    const dueDate = new Date(task.dueDate)
    // If task is completed and completed before today, filter it out
    if (task.completed && task.completedAt) {
      const completedDate = new Date(task.completedAt)
      if (isBefore(completedDate, today)) return false
    }
    return isToday(dueDate)
  })

  const upcomingTasks = tasks.filter(task => {
    if (!task.dueDate) return false
    const dueDate = new Date(task.dueDate)
    return isAfter(dueDate, tomorrow)
  })

  const completedTasks = tasks.filter(task => task.completed)

  // Task operations
  const addTask = async (task: Omit<Todo, 'id' | 'userId' | 'createdAt'>) => {
    if (!user?.id) throw new Error('User not authenticated')

    try {
      const newTask = {
        ...task,
        userId: user.id,
        completed: false,
        completedAt: null,
        subtasks: task.subtasks || [],
      }

      // Try to add to Firebase
      const id = await addTodo(newTask as Omit<Todo, 'id'>)
      
      // Fetch fresh data to ensure we have the correct timestamps
      const updatedTasks = await getTodos(user.id)
      setTasks(updatedTasks)
      
      // Update local storage
      const localStorageKey = `tasks_${user.id}`
      localStorage.setItem(localStorageKey, JSON.stringify(updatedTasks))
      
      return updatedTasks.find(t => t.id === id)
    } catch (err) {
      console.error('Error adding task:', err)
      toast({
        title: "Failed to add task",
        description: "Could not connect to the server. Please try again later.",
        variant: "destructive"
      })
      throw new Error('Failed to add task')
    }
  }

  const updateTask = async (taskId: string, updates: Partial<Todo>) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      // Optimistically update the UI first
      const taskToUpdate = tasks.find(t => t.id === taskId)
      if (taskToUpdate) {
        const updatedTask = { ...taskToUpdate, ...updates }
        const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t)
        setTasks(updatedTasks)
        
        // Update local storage immediately
        const localStorageKey = `tasks_${user.id}`
        localStorage.setItem(localStorageKey, JSON.stringify(updatedTasks))
      }
      
      // Then try to update Firebase
      await updateTodo(taskId, updates)
      
      // Fetch fresh data to ensure we have the correct timestamps
      const freshTasks = await getTodos(user.id)
      setTasks(freshTasks)
      
      // Update local storage with the latest data
      const localStorageKey = `tasks_${user.id}`
      localStorage.setItem(localStorageKey, JSON.stringify(freshTasks))
    } catch (err) {
      console.error('Error updating task:', err)
      // The optimistic update already happened, so we don't need to revert the UI
      // Just throw the error so the caller can handle it
      throw new Error('Failed to update task')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!user?.id) throw new Error('User not authenticated')
    
    try {
      // Optimistically update the UI first
      const updatedTasks = tasks.filter(t => t.id !== taskId)
      setTasks(updatedTasks)
      
      // Update local storage immediately
      const localStorageKey = `tasks_${user.id}`
      localStorage.setItem(localStorageKey, JSON.stringify(updatedTasks))
      
      // Then try to delete from Firebase
      await deleteTodo(taskId)
    } catch (err) {
      console.error('Error deleting task:', err)
      toast({
        title: "Failed to delete task",
        description: "The task will be deleted locally but may reappear when you reconnect.",
        variant: "destructive"
      })
      // We don't revert the UI since the task is already removed
      // Just throw the error so the caller can handle it
      throw new Error('Failed to delete task')
    }
  }

  return {
    loading,
    error,
    tasks,
    overdueTasks,
    todaysTasks,
    upcomingTasks,
    completedTasks,
    addTask,
    updateTask,
    deleteTask
  }
}