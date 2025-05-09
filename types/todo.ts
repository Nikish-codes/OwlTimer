export interface Todo {
  id: string
  userId: string
  text: string
  subject: string
  priority: "low" | "medium" | "high"
  completed: boolean
  dueDate: string
  createdAt: string
  subtasks: Subtask[]
  lastModified?: string
  completedAt: string | null
  synced?: boolean
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    endDate?: string
  }
} 

export interface Subtask {
  id: string
  text: string
  completed: boolean
} 