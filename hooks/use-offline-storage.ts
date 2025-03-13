import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/use-toast'
import { Todo } from '@/types/todo'
import { CalendarEvent } from '@/types/event'

interface OfflineData {
  todos: Todo[]
  studyTime: Record<string, number>
  events: CalendarEvent[]
}

export function useOfflineStorage() {
  const [offlineData, setOfflineData] = useState<OfflineData>(() => {
    if (typeof window === 'undefined') return { todos: [], studyTime: {}, events: [] }
    const saved = localStorage.getItem('offlineData')
    return saved ? JSON.parse(saved) : { todos: [], studyTime: {}, events: [] }
  })

  useEffect(() => {
    try {
      localStorage.setItem('offlineData', JSON.stringify(offlineData))
    } catch (error) {
      toast({
        title: "Error saving data",
        description: "Your progress might not be saved offline",
        variant: "destructive"
      })
    }
  }, [offlineData])

  const updateOfflineData = (data: Partial<OfflineData>) => {
    const newData = { ...offlineData, ...data }
    setOfflineData(newData)
    localStorage.setItem('offlineData', JSON.stringify(newData))
  }

  const updateStudyTime = (subject: string, minutes: number) => {
    const newStudyTime = { ...offlineData.studyTime }
    newStudyTime[subject] = (newStudyTime[subject] || 0) + minutes
    updateOfflineData({ studyTime: newStudyTime })
  }

  return {
    offlineData,
    updateOfflineData,
    updateStudyTime
  }
} 
