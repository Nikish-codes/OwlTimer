"use client"

import { createContext, useContext, useState, useEffect } from 'react'
import { useFirebase } from '@/components/firebase-provider'
import { doc, updateDoc, addDoc, collection, increment } from 'firebase/firestore'
import { toast } from 'react-hot-toast'

type TimerType = 'study' | 'mock_test' | 'pomodoro' | 'focus'

interface TimerContextType {
  timer: number
  isStudying: boolean
  selectedSubject: string
  timerType: TimerType
  isPaused: boolean
  startStudying: (subject: string) => void
  startMockTest: () => void
  stopStudying: () => Promise<void>
  pauseTimer: () => void
  resumeTimer: () => void
  setTimer: (value: number) => void
  loading: boolean
  setSelectedSubject: (subject: string) => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

const AUTO_SAVE_INTERVAL = 60 // Auto save every minute
const TIMER_STORAGE_KEY = 'study_timer_state'

interface TimerState {
  timer: number
  isStudying: boolean
  selectedSubject: string
  timerType: TimerType
  isPaused: boolean
  lastSaveTime: number
  startTime: number
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { db, user } = useFirebase()
  const [timer, setTimer] = useState(0)
  const [isStudying, setIsStudying] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('Physics')
  const [loading, setLoading] = useState(false)
  const [timerType, setTimerType] = useState<TimerType>('study')
  const [isPaused, setIsPaused] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState(0)
  const [startTime, setStartTime] = useState(0)

  // Add beforeunload event listener
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isStudying && !isPaused) {
        // Pause the timer and save state before unload
        const state: TimerState = {
          timer,
          isStudying,
          selectedSubject,
          timerType,
          isPaused: true, // Force pause on unload
          lastSaveTime,
          startTime: startTime || Date.now()
        }
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [timer, isStudying, selectedSubject, timerType, isPaused, lastSaveTime, startTime])

  // Load saved timer state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(TIMER_STORAGE_KEY)
    if (savedState) {
      const state: TimerState = JSON.parse(savedState)
      
      // Don't add elapsed time, just restore the saved state
      setTimer(state.timer)
      setIsStudying(state.isStudying)
      setSelectedSubject(state.selectedSubject)
      setTimerType(state.timerType)
      setIsPaused(true) // Always start paused when restoring
      setLastSaveTime(state.lastSaveTime)
      setStartTime(state.startTime)

      // Show toast notification
      toast.custom((t) => (
        <div className="bg-background border p-4 rounded-lg shadow-lg">
          <p className="font-semibold">Timer Paused</p>
          <p className="text-sm text-muted-foreground">Your session was paused. Click Resume to continue.</p>
        </div>
      ))
    }
  }, [])

  // Save timer state on changes
  useEffect(() => {
    if (isStudying) {
      const state: TimerState = {
        timer,
        isStudying,
        selectedSubject,
        timerType,
        isPaused,
        lastSaveTime,
        startTime
      }
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state))
    } else {
      localStorage.removeItem(TIMER_STORAGE_KEY)
    }
  }, [timer, isStudying, selectedSubject, timerType, isPaused, lastSaveTime, startTime])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isStudying && !isPaused) {
      interval = setInterval(() => {
        setTimer(prev => {
          // For mock test, stop at 3 hours
          if (timerType === 'mock_test' && prev >= 3 * 60 * 60) {
            setIsStudying(false)
            return prev
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isStudying, isPaused, timerType])

  // Real-time updates and auto-save progress
  useEffect(() => {
    const updateProgress = async () => {
      if (!user || !isStudying || isPaused) return

      try {
        // Update user's study times in real-time
        const userRef = doc(db, 'users', user.uid)
        
        // Only update every minute instead of every second
        if (timer % 60 === 0) {
          await updateDoc(userRef, {
            [`studyTimes.${selectedSubject}`]: increment(1), // Increment by 1 minute
            totalStudyTime: increment(1)
          })
        }

        // Only save intermediate sessions, not the final one
        const timeSinceLastSave = timer - lastSaveTime
        if (timeSinceLastSave >= AUTO_SAVE_INTERVAL && isStudying) {
          const now = new Date()
          const sessionStartTime = new Date(now.getTime() - timeSinceLastSave * 1000)
          
          let displayName = user.displayName
          if (!displayName) {
            if (user.email) {
              displayName = user.email.split('@')[0]
              displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).replace(/[0-9]/g, '')
            } else {
              displayName = 'User-' + user.uid.slice(0, 4)
            }
          }
          
          // Add intermediate session record
          await addDoc(collection(db, 'study-sessions'), {
            userId: user.uid,
            username: displayName,
            subject: selectedSubject,
            duration: Math.floor(timeSinceLastSave / 60),
            type: timerType,
            startTime: sessionStartTime,
            endTime: now,
            timestamp: now.toISOString(),
            date: now.toISOString(),
            createdAt: now.toISOString(),
            isIntermediate: true // Mark as intermediate session
          })

          setLastSaveTime(timer)
        }

      } catch (error) {
        console.error('Error updating progress:', error)
      }
    }

    updateProgress()
  }, [timer, user, db, isStudying, isPaused, selectedSubject, timerType, lastSaveTime])

  const startStudying = (subject: string) => {
    setIsStudying(true)
    setTimer(0)
    setLastSaveTime(0)
    setTimerType('study')
    setIsPaused(false)
    setStartTime(Date.now())
  }

  const startMockTest = () => {
    setSelectedSubject('Mock Test')
    setIsStudying(true)
    setTimer(0)
    setLastSaveTime(0)
    setTimerType('mock_test')
    setIsPaused(false)
    setStartTime(Date.now())
  }

  const stopStudying = async () => {
    setIsStudying(false)
    setIsPaused(false)
    localStorage.removeItem(TIMER_STORAGE_KEY)
    return Promise.resolve()
  }

  const pauseTimer = () => {
    setIsPaused(true)
  }

  const resumeTimer = () => {
    setIsPaused(false)
    // Don't adjust start time on resume to prevent time jumping
    setStartTime(Date.now())
  }

  return (
    <TimerContext.Provider value={{
      timer,
      isStudying,
      selectedSubject,
      timerType,
      isPaused,
      startStudying,
      startMockTest,
      stopStudying,
      pauseTimer,
      resumeTimer,
      setTimer,
      loading,
      setSelectedSubject
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