"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useToast } from "@/components/ui/use-toast"

type TimerMode = 'normal' | 'pomodoro'
type PomodoroPhase = 'work' | 'break'

interface TimerContextType {
  mode: TimerMode;
  setMode: (mode: TimerMode) => void;
  isRunning: boolean;
  startTimer: (resuming?: boolean) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  currentTime: number;
  pomodoroSettings: {
    workDuration: number;
    breakDuration: number;
  };
  setPomodoroSettings: (settings: { workDuration: number; breakDuration: number }) => void;
  currentPhase: PomodoroPhase;
  totalElapsedTime: number;
  sessionStartTime: number | null;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const [mode, setMode] = useState<TimerMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('timerMode') as TimerMode) || 'normal'
    }
    return 'normal'
  })
  
  const [isRunning, setIsRunning] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalElapsedTime, setTotalElapsedTime] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work')
  const [pomodoroSettings, setPomodoroSettings] = useState({
    workDuration: 25 * 60,
    breakDuration: 5 * 60
  })

  // Initialize state from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load timer state from localStorage
      const storedIsRunning = localStorage.getItem('timerRunning') === 'true'
      const storedCurrentTime = parseInt(localStorage.getItem('currentTime') || '0')
      const storedTotalElapsedTime = parseInt(localStorage.getItem('totalElapsedTime') || '0')
      const storedSessionStartTime = localStorage.getItem('sessionStartTime')
      const storedCurrentPhase = localStorage.getItem('currentPhase') as PomodoroPhase || 'work'
      const storedPomodoroSettings = localStorage.getItem('pomodoroSettings')

      // Set initial state from localStorage
      setIsRunning(storedIsRunning)
      setCurrentTime(storedCurrentTime)
      setTotalElapsedTime(storedTotalElapsedTime)
      setSessionStartTime(storedSessionStartTime ? parseInt(storedSessionStartTime) : null)
      setCurrentPhase(storedCurrentPhase)
      
      if (storedPomodoroSettings) {
        try {
          setPomodoroSettings(JSON.parse(storedPomodoroSettings))
        } catch (e) {
          console.error('Failed to parse pomodoro settings', e)
        }
      }

      // If timer was running, calculate elapsed time since last update
      if (storedIsRunning && storedSessionStartTime) {
        const lastSessionStart = parseInt(storedSessionStartTime)
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - lastSessionStart) / 1000)
        
        if (mode === 'normal') {
          setCurrentTime(storedCurrentTime + elapsedSeconds)
          setTotalElapsedTime(storedTotalElapsedTime + elapsedSeconds)
        } else {
          // For pomodoro mode, calculate remaining time
          const phaseDuration = storedCurrentPhase === 'work' 
            ? (storedPomodoroSettings ? JSON.parse(storedPomodoroSettings).workDuration : pomodoroSettings.workDuration)
            : (storedPomodoroSettings ? JSON.parse(storedPomodoroSettings).breakDuration : pomodoroSettings.breakDuration)
          
          setCurrentTime(Math.max(0, phaseDuration - elapsedSeconds))
          setTotalElapsedTime(storedTotalElapsedTime + elapsedSeconds)
        }
        
        // Update the session start time to now to prevent double-counting
        const newSessionStartTime = Date.now()
        setSessionStartTime(newSessionStartTime)
        localStorage.setItem('sessionStartTime', newSessionStartTime.toString())
      }
    }
    // This effect should only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer effect - only runs when the component is mounted
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isRunning) {
      // Store the current timestamp when timer starts/resumes
      if (!sessionStartTime) {
        const now = Date.now()
        setSessionStartTime(now)
        localStorage.setItem('sessionStartTime', now.toString())
      }

      interval = setInterval(() => {
        if (mode === 'normal') {
          setCurrentTime(prev => prev + 1)
          setTotalElapsedTime(prev => prev + 1)
        } else {
          setCurrentTime(prev => Math.max(0, prev - 1))
          setTotalElapsedTime(prev => prev + 1)
        }
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isRunning, mode, sessionStartTime])

  // Persist timer state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timerMode', mode)
      localStorage.setItem('timerRunning', isRunning.toString())
      localStorage.setItem('currentTime', currentTime.toString())
      localStorage.setItem('totalElapsedTime', totalElapsedTime.toString())
      localStorage.setItem('currentPhase', currentPhase)
      localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroSettings))
      
      // Only update sessionStartTime in localStorage when it changes
      if (sessionStartTime) {
        localStorage.setItem('sessionStartTime', sessionStartTime.toString())
      }
    }
  }, [mode, isRunning, currentTime, totalElapsedTime, currentPhase, sessionStartTime, pomodoroSettings])

  // Handle pomodoro phase changes
  useEffect(() => {
    if (mode === 'pomodoro' && isRunning && currentTime <= 0) {
      // Phase completed
      const newPhase = currentPhase === 'work' ? 'break' : 'work'
      setCurrentPhase(newPhase)
      
      // Set timer for the new phase
      setCurrentTime(newPhase === 'work' ? pomodoroSettings.workDuration : pomodoroSettings.breakDuration)
      
      // Play sound and show notification
      try {
        const audio = new Audio(newPhase === 'work' 
          ? 'https://assets.mixkit.co/active_storage/sfx/2574/2574.wav'
          : 'https://assets.mixkit.co/active_storage/sfx/2575/2575.wav')
        audio.play()
      } catch (error) {
        console.error('Failed to play sound:', error)
      }
      
      toast({
        title: newPhase === 'work' ? 'Break Ended' : 'Work Session Completed',
        description: newPhase === 'work' 
          ? 'Time to get back to work!' 
          : 'Take a break, you\'ve earned it!',
      })
    }
  }, [currentTime, mode, isRunning, currentPhase, pomodoroSettings, toast])

  // Handle page visibility changes to sync timer when tab becomes visible again
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isRunning && sessionStartTime) {
          // When page becomes visible again, sync the timer with the actual elapsed time
          const now = Date.now()
          const elapsedSeconds = Math.floor((now - sessionStartTime) / 1000)
          
          if (mode === 'normal') {
            // For normal mode, calculate the current time based on elapsed time
            const storedTime = parseInt(localStorage.getItem('currentTime') || '0')
            setCurrentTime(storedTime + elapsedSeconds)
            setTotalElapsedTime(parseInt(localStorage.getItem('totalElapsedTime') || '0') + elapsedSeconds)
          } else {
            // For pomodoro, calculate remaining time
            const phaseDuration = currentPhase === 'work' 
              ? pomodoroSettings.workDuration 
              : pomodoroSettings.breakDuration
            setCurrentTime(Math.max(0, phaseDuration - elapsedSeconds))
            setTotalElapsedTime(parseInt(localStorage.getItem('totalElapsedTime') || '0') + elapsedSeconds)
          }
          
          // Update the session start time to now
          setSessionStartTime(now)
          localStorage.setItem('sessionStartTime', now.toString())
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [isRunning, mode, sessionStartTime, currentPhase, pomodoroSettings])

  // Handle beforeunload event to save timer state before page refresh/close
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleBeforeUnload = () => {
        if (isRunning) {
          // Save the current timer state to localStorage
          localStorage.setItem('timerRunning', 'true')
          localStorage.setItem('currentTime', currentTime.toString())
          localStorage.setItem('totalElapsedTime', totalElapsedTime.toString())
          localStorage.setItem('sessionStartTime', sessionStartTime?.toString() || '')
        }
      }
      
      window.addEventListener('beforeunload', handleBeforeUnload)
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [isRunning, currentTime, totalElapsedTime, sessionStartTime])

  const startTimer = (resuming: boolean = false) => {
    if (!isRunning) {
      setIsRunning(true)
      
      if (!resuming || !sessionStartTime) {
        const now = Date.now()
        setSessionStartTime(now)
        localStorage.setItem('sessionStartTime', now.toString())
        
        // For pomodoro mode, set the initial time
        if (mode === 'pomodoro' && !resuming) {
          setCurrentTime(currentPhase === 'work' 
            ? pomodoroSettings.workDuration 
            : pomodoroSettings.breakDuration)
        }
      }
      
      // When resuming, we don't want to reset the timer
      if (!resuming) {
        localStorage.setItem('timerRunning', 'true')
      }
    }
  }

  const stopTimer = () => {
    setIsRunning(false)
    setSessionStartTime(null)
    localStorage.removeItem('sessionStartTime')
    localStorage.setItem('timerRunning', 'false')
  }

  const resetTimer = () => {
    // Only reset if we're explicitly calling this function
    // and not during component initialization or page navigation
    
    // First, check if we're in a visible tab - don't reset if we're in background
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      console.log('Attempted to reset timer while page is not visible - ignoring');
      return;
    }
    
    // Now proceed with the reset
    setIsRunning(false)
    setCurrentTime(mode === 'normal' ? 0 : pomodoroSettings.workDuration)
    setTotalElapsedTime(0)
    setSessionStartTime(null)
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
    localStorage.removeItem('sessionStartTime')
      localStorage.setItem('timerRunning', 'false')
      localStorage.setItem('currentTime', mode === 'normal' ? '0' : pomodoroSettings.workDuration.toString())
      localStorage.setItem('totalElapsedTime', '0')
      
      // Clear paused state
      localStorage.removeItem('pausedSubject')
      localStorage.removeItem('pausedElapsedTime')
    }
  }

  const pauseTimer = () => {
    setIsRunning(false)
    localStorage.setItem('timerRunning', 'false')
    
    // Store the current time when pausing
    localStorage.setItem('pausedTime', currentTime.toString())
    localStorage.setItem('pausedTotalElapsedTime', totalElapsedTime.toString())
  }

  return (
    <TimerContext.Provider value={{
      mode,
      setMode,
      isRunning,
      startTimer,
      stopTimer,
      pauseTimer,
      resetTimer,
      currentTime,
      pomodoroSettings,
      setPomodoroSettings,
      currentPhase,
      totalElapsedTime,
      sessionStartTime
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}