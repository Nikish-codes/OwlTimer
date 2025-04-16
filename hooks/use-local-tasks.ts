"use client"

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { startOfDay, endOfDay, addDays, isAfter, isBefore, isToday } from 'date-fns'

// Define the Task type
export interface Task {
  id: string
  userId: string
  text: string
  subject: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  completedAt: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  subtasks: { id: string; text: string; completed: boolean }[]
  synced?: boolean
}

// Define the return type of the hook
interface UseLocalTasksReturn {
  loading: boolean
  overdueTasks: Task[]
  todaysTasks: Task[]
  upcomingTasks: Task[]
  completedTasks: Task[]
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void
  updateTask: (task: Task) => void
  deleteTask: (taskId: string) => void
}

// Local storage key
const TASKS_STORAGE_KEY = 'todo-app-tasks'

export function useLocalTasks(): UseLocalTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Load tasks from local storage on component mount
  useEffect(() => {
    const loadTasks = () => {
      try {
        const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY)
        if (storedTasks) {
          setTasks(JSON.parse(storedTasks))
        }
      } catch (error) {
        console.error('Error loading tasks from local storage:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [])

  // Save tasks to local storage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
    }
  }, [tasks, loading])

  // Add a new task
  const addTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    }

    setTasks(prevTasks => [...prevTasks, newTask])
  }

  // Update an existing task
  const updateTask = (updatedTask: Task) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    )
  }

  // Delete a task
  const deleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId))
  }

  // Filter tasks into categories
  const now = new Date()
  const today = startOfDay(now)
  const tomorrow = endOfDay(now)

  const overdueTasks = tasks.filter(task => 
    !task.completed && 
    task.dueDate && 
    isBefore(new Date(task.dueDate), today)
  )

  const todaysTasks = tasks.filter(task => 
    !task.completed && 
    task.dueDate && 
    isToday(new Date(task.dueDate))
  )

  const upcomingTasks = tasks.filter(task => 
    !task.completed && 
    task.dueDate && 
    isAfter(new Date(task.dueDate), tomorrow)
  )

  const completedTasks = tasks.filter(task => task.completed)

  return {
    loading,
    overdueTasks,
    todaysTasks,
    upcomingTasks,
    completedTasks,
    addTask,
    updateTask,
    deleteTask
  }
} 