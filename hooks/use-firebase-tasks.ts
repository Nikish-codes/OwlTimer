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
  const [isOnline, setIsOnline] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial online status
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load tasks from local storage
  useEffect(() => {
    if (!user?.id) {
      setTasks([])
      setLoading(false)
      return
    }

    const loadTasks = async () => {
      try {
        setLoading(true)
        
        // Always load from local storage first
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

        // Check if we need to sync with Firebase (every 30 minutes)
        const lastSyncStr = localStorage.getItem('lastSync')
        const lastSyncTime = lastSyncStr ? new Date(lastSyncStr) : null
        const shouldSync = !lastSyncTime || (Date.now() - lastSyncTime.getTime() > 30 * 60 * 1000)
        
        // Only try Firebase if we're online and it's time to sync
        if (isOnline && shouldSync) {
          try {
            const fetchedTasks = await getTodos(user.id)
            
            // Merge local tasks with Firebase tasks
            const mergedTasks = [...tasksFromStorage]
            fetchedTasks.forEach(firebaseTask => {
              const existingTask = mergedTasks.find(t => t.id === firebaseTask.id)
              if (!existingTask) {
                mergedTasks.push(firebaseTask)
              } else if (new Date(firebaseTask.updatedAt || 0) > new Date(existingTask.updatedAt || 0)) {
                // If Firebase task is newer, update it
                Object.assign(existingTask, firebaseTask)
              }
            })
            
            setTasks(mergedTasks)
            
            // Update local storage with merged data
            localStorage.setItem(localStorageKey, JSON.stringify(mergedTasks))
            localStorage.setItem('lastSync', new Date().toISOString())
            setLastSync(new Date())
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
              setError('No tasks available offline')
            }
          }
        } else {
          // If we're offline or it's not time to sync, just use local storage
          if (tasksFromStorage.length === 0) {
            setError('No tasks available offline')
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [user?.id, isOnline])

  // Set up periodic sync with Firebase
  useEffect(() => {
    if (!isOnline || !user?.id) return

    const syncInterval = setInterval(async () => {
      try {
        const fetchedTasks = await getTodos(user.id)
        
        // Merge with local tasks instead of replacing
        const localStorageKey = `tasks_${user.id}`
        const localTasks = JSON.parse(localStorage.getItem(localStorageKey) || '[]')
        const mergedTasks = [...localTasks]
        
        fetchedTasks.forEach(firebaseTask => {
          const existingTask = mergedTasks.find(t => t.id === firebaseTask.id)
          if (!existingTask) {
            mergedTasks.push(firebaseTask)
          } else if (new Date(firebaseTask.updatedAt || 0) > new Date(existingTask.updatedAt || 0)) {
            Object.assign(existingTask, firebaseTask)
          }
        })
        
        setTasks(mergedTasks)
        localStorage.setItem(localStorageKey, JSON.stringify(mergedTasks))
        localStorage.setItem('lastSync', new Date().toISOString())
        setLastSync(new Date())
      } catch (err) {
        console.error('Error syncing with Firebase:', err)
        // Don't show error toast for background sync failures
      }
    }, 30 * 60 * 1000) // Sync every 30 minutes

    return () => clearInterval(syncInterval)
  }, [isOnline, user?.id])

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
        id: `local_${Date.now()}`, // Generate a temporary local ID
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Update local state and storage immediately
      const updatedTasks = [...tasks, newTask]
      setTasks(updatedTasks)
      
      // Update local storage
      const localStorageKey = `tasks_${user.id}`
      localStorage.setItem(localStorageKey, JSON.stringify(updatedTasks))
      
      // Store the task for later sync with Firebase
      const pendingTasks = JSON.parse(localStorage.getItem('pendingTasks') || '[]')
      pendingTasks.push(newTask)
      localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks))
      
      // Show success message
      toast({
        title: "Task added",
        description: "Task has been saved locally",
        variant: "default"
      })
      
      return newTask
    } catch (err) {
      console.error('Error adding task:', err)
      toast({
        title: "Failed to add task",
        description: "Could not save the task. Please try again.",
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
        const updatedTask = { 
          ...taskToUpdate, 
          ...updates,
          updatedAt: new Date().toISOString()
        }
        const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t)
        setTasks(updatedTasks)
        
        // Update local storage immediately
        const localStorageKey = `tasks_${user.id}`
        localStorage.setItem(localStorageKey, JSON.stringify(updatedTasks))
        
        // Store the update for later sync with Firebase
        const pendingUpdates = JSON.parse(localStorage.getItem('pendingUpdates') || '[]')
        pendingUpdates.push({ taskId, updates })
        localStorage.setItem('pendingUpdates', JSON.stringify(pendingUpdates))
      }
    } catch (err) {
      console.error('Error updating task:', err)
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
      
      // Store the deletion for later sync with Firebase
      const pendingDeletions = JSON.parse(localStorage.getItem('pendingDeletions') || '[]')
      pendingDeletions.push(taskId)
      localStorage.setItem('pendingDeletions', JSON.stringify(pendingDeletions))
    } catch (err) {
      console.error('Error deleting task:', err)
      toast({
        title: "Failed to delete task",
        description: "Could not delete the task. Please try again.",
        variant: "destructive"
      })
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
    deleteTask,
    isOnline,
    lastSync
  }
}