"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface TimerContextType {
  timer: number
  isStudying: boolean
  selectedSubject: string
  startStudying: (subject: string) => void
  stopStudying: () => Promise<void>
  setTimer: (value: number) => void
  loading: boolean
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState(0)
  const [isStudying, setIsStudying] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isStudying) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isStudying])

  const startStudying = (subject: string) => {
    setSelectedSubject(subject)
    setIsStudying(true)
    setTimer(0)
  }

  const stopStudying = async () => {
    setIsStudying(false)
    return new Promise<void>(resolve => resolve())
  }

  return (
    <TimerContext.Provider value={{
      timer,
      isStudying,
      selectedSubject,
      startStudying,
      stopStudying,
      setTimer,
      loading
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
} 