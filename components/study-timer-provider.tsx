"use client"

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
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
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
  };
  setPomodoroSettings: (settings: { workDuration: number; breakDuration: number; longBreakDuration: number; sessionsBeforeLongBreak: number }) => void;
  currentPhase: PomodoroPhase;
  totalElapsedTime: number;
  sessionStartTime: number | null;
  completedSessions: number;
  skipBreak: () => void;
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
    breakDuration: 5 * 60,
    longBreakDuration: 15 * 60,
    sessionsBeforeLongBreak: 4
  })

  // Track completed pomodoro sessions
  const [completedSessions, setCompletedSessions] = useState(0)

  // Ref to track the last phase change time to prevent multiple triggers
  const lastPhaseChangeRef = useRef<number>(0)

  // Ref to track the last tick time for accurate timing across tab switches
  const lastTickTimeRef = useRef<number>(Date.now())

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

          // Update total elapsed time and store it in localStorage
          const newTotalElapsedTime = storedTotalElapsedTime + elapsedSeconds
          setTotalElapsedTime(newTotalElapsedTime)
          localStorage.setItem('totalElapsedTime', newTotalElapsedTime.toString())
        } else {
          // For pomodoro mode, calculate remaining time
          const phaseDuration = storedCurrentPhase === 'work'
            ? (storedPomodoroSettings ? JSON.parse(storedPomodoroSettings).workDuration : pomodoroSettings.workDuration)
            : (storedPomodoroSettings ? JSON.parse(storedPomodoroSettings).breakDuration : pomodoroSettings.breakDuration)

          setCurrentTime(Math.max(0, phaseDuration - elapsedSeconds))

          // Update total elapsed time and store it in localStorage
          const newTotalElapsedTime = storedTotalElapsedTime + elapsedSeconds
          setTotalElapsedTime(newTotalElapsedTime)
          localStorage.setItem('totalElapsedTime', newTotalElapsedTime.toString())
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

      // Initialize the last tick time
      lastTickTimeRef.current = Date.now()

      // Use a more precise interval for better accuracy
      interval = setInterval(() => {
        const now = Date.now()
        // Calculate actual elapsed seconds since last tick (handles tab switching)
        const elapsedSeconds = Math.floor((now - lastTickTimeRef.current) / 1000)

        // Only update if at least 1 second has passed
        if (elapsedSeconds > 0) {
          // Update last tick time
          lastTickTimeRef.current = now

          // Dispatch a custom event for minute changes
          const oldTotalMinutes = Math.floor(totalElapsedTime / 60)
          const newTotalMinutes = Math.floor((totalElapsedTime + elapsedSeconds) / 60)
          const minuteChanged = newTotalMinutes > oldTotalMinutes

          if (mode === 'normal') {
            // Update current time
            setCurrentTime(prev => prev + elapsedSeconds)

            // Update total elapsed time
            setTotalElapsedTime(prev => {
              const newValue = prev + elapsedSeconds
              // Update localStorage
              localStorage.setItem('totalElapsedTime', newValue.toString())
              return newValue
            })

            // If we crossed a minute boundary, dispatch an event
            if (minuteChanged) {
              window.dispatchEvent(new CustomEvent('timer-minute-changed', {
                detail: { minutes: newTotalMinutes }
              }))
            }
          } else {
            // For pomodoro mode, handle countdown with elapsed seconds
            setCurrentTime(prev => {
              const newValue = Math.max(0, prev - elapsedSeconds)
              return newValue
            })

            // Update total elapsed time
            setTotalElapsedTime(prev => {
              const newValue = prev + elapsedSeconds
              // Update localStorage
              localStorage.setItem('totalElapsedTime', newValue.toString())
              return newValue
            })

            // If we crossed a minute boundary, dispatch an event
            if (minuteChanged) {
              window.dispatchEvent(new CustomEvent('timer-minute-changed', {
                detail: { minutes: newTotalMinutes }
              }))
            }
          }

          // Log the current timer state for debugging
          console.log('Timer tick:', {
            currentTime,
            totalElapsedTime,
            elapsedSeconds,
            mode,
            currentPhase
          })
        }
      }, 500) // Run twice per second for better accuracy
    }

    return () => clearInterval(interval)
  }, [isRunning, mode, sessionStartTime, totalElapsedTime, currentPhase])

  // Effect to handle mode changes - completely reset timer on mode change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timerMode', mode)

      // Always reset the timer when mode changes
      setIsRunning(false)

      // Reset timer for the new mode
      if (mode === 'normal') {
        // When switching to normal mode, always start from 0
        setCurrentTime(0)
        setTotalElapsedTime(0)
      } else {
        // When switching to pomodoro, always start with full work duration
        setCurrentPhase('work')
        setCurrentTime(pomodoroSettings.workDuration)
        setTotalElapsedTime(0)
      }

      // Reset session start time
      setSessionStartTime(null)

      // Clear localStorage values
      localStorage.setItem('timerRunning', 'false')
      localStorage.setItem('currentTime', mode === 'normal' ? '0' : pomodoroSettings.workDuration.toString())
      localStorage.setItem('totalElapsedTime', '0')
      localStorage.removeItem('sessionStartTime')
      localStorage.removeItem('pausedTime')
      localStorage.removeItem('pausedTotalElapsedTime')
      localStorage.removeItem('pausedSessionStartTime')
      localStorage.removeItem('pausedSubject')
      localStorage.removeItem('pausedElapsedTime')
      localStorage.removeItem('pausedPhase')
    }
  }, [mode, pomodoroSettings.workDuration]);

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
    // Only trigger when timer reaches exactly zero, not when it's already at zero
    if (mode === 'pomodoro' && isRunning && currentTime === 0) {
      // Prevent multiple triggers within 2 seconds
      const now = Date.now();
      if (now - lastPhaseChangeRef.current < 2000) {
        return;
      }

      // Update the last phase change time
      lastPhaseChangeRef.current = now;

      // Store the current phase before changing it (for event dispatching)
      // const completedPhase = currentPhase; // Unused variable

      // Handle phase transition
      if (currentPhase === 'work') {
        // Work phase completed

        // Increment completed sessions counter
        const newCompletedSessions = completedSessions + 1;
        setCompletedSessions(newCompletedSessions);

        // Determine if we should take a long break
        const isLongBreakDue = newCompletedSessions % pomodoroSettings.sessionsBeforeLongBreak === 0;

        // Set timer for the break phase
        const breakDuration = isLongBreakDue
          ? pomodoroSettings.longBreakDuration
          : pomodoroSettings.breakDuration;

        // Switch to break phase
        setCurrentPhase('break');
        setCurrentTime(breakDuration);

        // Dispatch event for completed work session
        const completedWorkMinutes = Math.floor(pomodoroSettings.workDuration / 60);

        // Define the event interface
        interface PomodoroWorkCompletedEventDetail {
          duration: number;
          timestamp: string;
        }

        // Create the event with proper typing
        const eventDetail: PomodoroWorkCompletedEventDetail = {
          duration: completedWorkMinutes,
          timestamp: new Date().toISOString()
        };

        // Dispatch custom event with the completed work duration
        window.dispatchEvent(new CustomEvent<PomodoroWorkCompletedEventDetail>('pomodoro-work-completed', {
          detail: eventDetail
        }));

        // Show notification
        toast({
          title: isLongBreakDue ? "Long Break Time!" : "Break Time!",
          description: isLongBreakDue
            ? `Great job completing ${pomodoroSettings.sessionsBeforeLongBreak} work sessions! Take a longer break.`
            : "Work session completed. Take a short break!",
        });
      } else {
        // Break phase completed

        // Switch back to work phase
        setCurrentPhase('work');
        setCurrentTime(pomodoroSettings.workDuration);

        // Show notification
        toast({
          title: "Break Ended",
          description: "Time to get back to work!",
        });
      }
    }
  }, [currentTime, mode, isRunning, currentPhase, pomodoroSettings, toast, completedSessions]);

  // Handle page visibility changes to sync timer when tab becomes visible again
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && isRunning) {
          // When page becomes visible again, update the last tick time
          lastTickTimeRef.current = Date.now()
        }
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
  }, [isRunning])

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
      // When resuming, we need to restore the paused state
      if (resuming) {
        // Restore the paused time
        const pausedTime = localStorage.getItem('pausedTime')
        if (pausedTime) {
          setCurrentTime(parseInt(pausedTime))
        }

        // Restore the paused total elapsed time
        const pausedTotalElapsedTime = localStorage.getItem('pausedTotalElapsedTime')
        if (pausedTotalElapsedTime) {
          setTotalElapsedTime(parseInt(pausedTotalElapsedTime))
          // Also update in localStorage to ensure consistency
          localStorage.setItem('totalElapsedTime', pausedTotalElapsedTime)
        }

        // Restore the paused phase for pomodoro mode
        const pausedPhase = localStorage.getItem('pausedPhase') as PomodoroPhase
        if (pausedPhase) {
          setCurrentPhase(pausedPhase)
        }

        // Log the resumed state for debugging
        console.log('Resuming timer with:', {
          currentTime: pausedTime ? parseInt(pausedTime) : currentTime,
          totalElapsedTime: pausedTotalElapsedTime ? parseInt(pausedTotalElapsedTime) : totalElapsedTime,
          currentPhase: pausedPhase || currentPhase
        })
      } else if (mode === 'pomodoro') {
        // For pomodoro mode, set the initial time only if not resuming
        setCurrentTime(currentPhase === 'work'
          ? pomodoroSettings.workDuration
          : pomodoroSettings.breakDuration)
      }

      // Set the timer to running
      setIsRunning(true)
      localStorage.setItem('timerRunning', 'true')

      // Always set a new session start time to ensure accurate timing
      const now = Date.now()
      setSessionStartTime(now)
      localStorage.setItem('sessionStartTime', now.toString())
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

      // Clear all paused state
      localStorage.removeItem('pausedSubject')
      localStorage.removeItem('pausedElapsedTime')
      localStorage.removeItem('pausedTime')
      localStorage.removeItem('pausedTotalElapsedTime')
      localStorage.removeItem('pausedSessionStartTime')
      localStorage.removeItem('pausedPhase')
    }
  }

  const pauseTimer = () => {
    // Pause the timer first
    setIsRunning(false)
    localStorage.setItem('timerRunning', 'false')

    // Store the current time when pausing
    localStorage.setItem('pausedTime', currentTime.toString())
    localStorage.setItem('pausedTotalElapsedTime', totalElapsedTime.toString())

    // Also store the current phase for pomodoro mode
    localStorage.setItem('pausedPhase', currentPhase)

    // Log the paused state for debugging
    console.log('Paused timer with:', {
      currentTime,
      totalElapsedTime,
      currentPhase
    })
  }

  const skipBreak = () => {
    if (mode === 'pomodoro' && currentPhase === 'break') {
      // Skip the current break and start a new work session
      setCurrentPhase('work');
      setCurrentTime(pomodoroSettings.workDuration);

      // If timer is not running, start it
      if (!isRunning) {
        setIsRunning(true);
        const now = Date.now();
        setSessionStartTime(now);
        localStorage.setItem('sessionStartTime', now.toString());
      }

      // Show notification
      toast({
        title: "Break Skipped",
        description: "Starting a new work session.",
      });
    }
  };

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
      sessionStartTime,
      completedSessions,
      skipBreak
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