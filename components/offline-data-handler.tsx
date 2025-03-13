"use client"

import { useEffect, useState } from 'react'

export function OfflineDataHandler() {
  const [studyTime, setStudyTime] = useState(0)
  const [todos, setTodos] = useState([])

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem('offlineStudyTime', studyTime.toString())
      localStorage.setItem('offlineTodos', JSON.stringify(todos))
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [studyTime, todos])

  return null
} 
