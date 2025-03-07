"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useFirebase } from '@/components/firebase-provider'
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useOfflineStorage } from '@/hooks/use-offline-storage'
import { toast } from '@/components/ui/use-toast'
import { useTimer } from '@/components/study-timer-provider'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2 } from "lucide-react"

const subjects = ['Physics', 'Chemistry', 'Mathematics'] as const
type Subject = typeof subjects[number]
type StudyTimesType = Record<Subject, number>

interface StudyTrackerProps {
  expanded?: boolean
}

export function StudyTracker({ expanded = false }: StudyTrackerProps) {
  const { db, user } = useFirebase()
  const { offlineData, updateStudyTime } = useOfflineStorage()
  const [selectedSubject, setSelectedSubject] = useState<keyof StudyTimesType>(subjects[0])
  const [isStudying, setIsStudying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [studyTimes, setStudyTimes] = useState<StudyTimesType>({
    Physics: 0,
    Chemistry: 0,
    Mathematics: 0
  })

  const [sessionStartTime, setSessionStartTime] = useState<StudyTimesType>({
    Physics: 0,
    Chemistry: 0,
    Mathematics: 0
  })

  const [targetTimes, setTargetTimes] = useState<StudyTimesType>({
    Physics: 120 * 60, // 2 hours in seconds
    Chemistry: 120 * 60,
    Mathematics: 120 * 60
  })

  // Get timer context first to avoid using isRunning before declaration
  const {
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
    totalElapsedTime
  } = useTimer();

  // Track if mode changes are from explicit user action or just component mounting
  const isFirstRender = useRef(true);
  const prevMode = useRef(mode);

  // Calculate subject progress in hours for display
  const subjectProgress = {
    Physics: studyTimes.Physics / 60, // Convert minutes to hours
    Chemistry: studyTimes.Chemistry / 60,
    Mathematics: studyTimes.Mathematics / 60
  }

  // Handle target time changes
  const handleTargetTimeChange = (subject: Subject, timeInSeconds: number) => {
    setTargetTimes(prev => ({
      ...prev,
      [subject]: timeInSeconds
    }))
  }

  // Load study times from database or local storage
  useEffect(() => {
    if (user) {
      loadStudyTimes()
    } else {
      setStudyTimes(offlineData.studyTime as StudyTimesType)
    }
  }, [user, offlineData.studyTime])

  // Sync local isStudying state with timer context
  useEffect(() => {
    // Update local isStudying state based on timer context
    setIsStudying(isRunning);
    
    // When component mounts or remounts, check if timer is running
    // and restore the session state from localStorage
    if (isRunning) {
      // If timer is already running when component mounts,
      // we need to restore the session state
      const storedSubject = localStorage.getItem('selectedSubject');
      if (storedSubject && subjects.includes(storedSubject as Subject)) {
        setSelectedSubject(storedSubject as Subject);
      }
      
      // Restore session start time from localStorage if available
      const storedSessionStartTime = localStorage.getItem('sessionStartTimes');
      if (storedSessionStartTime) {
        try {
          const parsedTimes = JSON.parse(storedSessionStartTime);
          setSessionStartTime(parsedTimes);
        } catch (e) {
          console.error('Failed to parse stored session start times', e);
        }
      }
    }
    
    // Important: Do NOT call resetTimer() here as it would reset the timer
    // every time this component mounts or when isRunning changes
  }, [isRunning]);
  
  // Store selected subject and session start times in localStorage
  // when they change, so they can be restored when navigating back
  useEffect(() => {
    if (isStudying) {
      localStorage.setItem('selectedSubject', selectedSubject);
      localStorage.setItem('sessionStartTimes', JSON.stringify(sessionStartTime));
    } else {
      localStorage.removeItem('selectedSubject');
      localStorage.removeItem('sessionStartTimes');
    }
  }, [isStudying, selectedSubject, sessionStartTime]);

  // Effect to handle mode switching
  useEffect(() => {
    // Skip the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevMode.current = mode;
      return;
    }
    
    // Check if this is an actual mode change, not just component mounting
    const isModeChanged = prevMode.current !== mode;
    prevMode.current = mode;
    
    // Only handle explicit mode changes while studying
    if (isModeChanged && isStudying) {
      // If we're already studying and mode changes, stop and save current session
      stopStudying();
    }
    
    // Don't reset the timer here - that would reset it on every mount
  }, [mode, isStudying]);

  const loadStudyTimes = async () => {
    try {
      if (!user) return
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      if (userData?.studyTimes) {
        setStudyTimes(userData.studyTimes)
      }
    } catch (error) {
      toast({
        title: "Error loading study times",
        description: "Please try again later",
        variant: "destructive"
      })
    }
  }

  const [showSettings, setShowSettings] = useState(false)

  // Effect to handle real-time study time updates
  useEffect(() => {
    if (isStudying && isRunning && mode === 'normal') {
      const updateStudyTimeInRealTime = async () => {
        // Calculate elapsed minutes from totalElapsedTime
        const elapsedMinutes = Math.floor(totalElapsedTime / 60)
        
        // Important: Use the initial session start time as the base
        // This prevents double-counting when pausing and resuming
        const updatedTime = sessionStartTime[selectedSubject] + elapsedMinutes

        // Only update if the time has actually changed
        if (studyTimes[selectedSubject] !== updatedTime) {
          const newStudyTimes = { ...studyTimes, [selectedSubject]: updatedTime }

          if (user) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                studyTimes: newStudyTimes
              })
              setStudyTimes(newStudyTimes)
            } catch (error) {
              // Handle offline mode
              setStudyTimes(newStudyTimes)
              updateStudyTime(selectedSubject, updatedTime)
            }
          } else {
            setStudyTimes(newStudyTimes)
            updateStudyTime(selectedSubject, updatedTime)
          }
        }
      }

      const intervalId = setInterval(updateStudyTimeInRealTime, 1000)
      return () => clearInterval(intervalId)
    }
  }, [isStudying, isRunning, mode, selectedSubject, sessionStartTime, studyTimes, totalElapsedTime, user])

  const startStudying = () => {
    // If we're already studying, we need to save the current session before starting a new one
    if (isStudying) {
      stopStudying().then(() => {
        // After stopping the previous session, start a new one
        startNewStudySession();
      });
    } else {
      // If we're not already studying, just start a new session
      startNewStudySession();
    }
  };
  
  // Helper function to start a new study session
  const startNewStudySession = () => {
    // Check if we're resuming from a paused state
    const pausedSubject = localStorage.getItem('pausedSubject');
    const pausedElapsedTime = localStorage.getItem('pausedElapsedTime');
    const pausedTime = localStorage.getItem('pausedTime');
    
    if (pausedSubject === selectedSubject && pausedElapsedTime && pausedTime) {
      // We're resuming the same subject, don't reset the timer
      startTimer(true);
      setIsStudying(true);
      
      // Set the session start time for the selected subject
      setSessionStartTime({
        ...sessionStartTime,
        [selectedSubject]: studyTimes[selectedSubject]
      });
      
      toast({
        title: "Study session resumed",
        description: `Continuing ${selectedSubject} study session`
      });
    } else {
      // This is a new session, reset the timer
      resetTimer();
      
      // Start the timer
      startTimer();
      
      // Set studying state
      setIsStudying(true);
      
      // Set the session start time for the selected subject
      setSessionStartTime({
        ...sessionStartTime,
        [selectedSubject]: studyTimes[selectedSubject]
      });
      
      toast({
        title: "Study session started",
        description: `Subject: ${selectedSubject} - ${currentPhase === 'work' ? 'Work Time' : 'Break Time'}`
      });
      
      // Clear any paused state
      localStorage.removeItem('pausedSubject');
      localStorage.removeItem('pausedElapsedTime');
      localStorage.removeItem('pausedTime');
    }
  };

  const stopStudying = async () => {
    stopTimer();
    setIsStudying(false);
    const minutes = Math.floor(totalElapsedTime / 60);

    if (minutes === 0) {
      toast({
        title: "Session too short",
        description: "Study for at least a minute to record the session",
        variant: "destructive"
      });
      // Only reset the timer for short sessions if we're on the timer page
      // This prevents resetting when navigating away
      if (document.visibilityState === 'visible') {
        resetTimer();
      }
      return;
    }

    const saveStudySession = async (minutes: number, type: 'focus' | 'pomodoro') => {
      if (minutes === 0) return;

      const session = {
        subject: selectedSubject,
        duration: minutes,
        type,
        timestamp: Timestamp.now()
      };

      if (user) {
        try {
          // Save to Firebase
          await addDoc(collection(db, 'users', user.uid, 'sessions'), session);
        } catch (error) {
          toast({
            title: "Error saving session",
            description: "Your session will be saved locally",
            variant: "destructive"
          });
          // Fall back to offline storage
          updateStudyTime(selectedSubject, studyTimes[selectedSubject] + minutes);
        }
      } else {
        // Save to offline storage
        updateStudyTime(selectedSubject, studyTimes[selectedSubject] + minutes);
      }

      toast({
        title: "Study session saved",
        description: `${minutes} minutes of ${selectedSubject} recorded`
      });
    };

    // Call saveStudySession to actually save the session
    await saveStudySession(minutes, mode === 'normal' ? 'focus' : 'pomodoro');
    
    // Only reset the timer if we're explicitly stopping (not when navigating away)
    // This prevents resetting when navigating away
    if (document.visibilityState === 'visible') {
      resetTimer();
    }
    
    setLoading(false);
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className={expanded ? "h-full" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Study Tracker</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === 'normal' ? 'pomodoro' : 'normal')}
            >
              {mode === 'normal' ? 'Switch to Pomodoro' : 'Switch to Normal'}
            </Button>
            {mode === 'pomodoro' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                Settings
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showSettings && mode === 'pomodoro' && (
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="font-semibold mb-4">Pomodoro Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={pomodoroSettings.workDuration / 60}
                    onChange={(e) => setPomodoroSettings({
                      ...pomodoroSettings,
                      workDuration: parseInt(e.target.value) * 60
                    })}
                    min={1}
                    max={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Break Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={pomodoroSettings.breakDuration / 60}
                    onChange={(e) => setPomodoroSettings({
                      ...pomodoroSettings,
                      breakDuration: parseInt(e.target.value) * 60
                    })}
                    min={1}
                    max={30}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className={cn(
          "space-y-6",
          expanded && "md:grid md:grid-cols-2 md:gap-6 md:space-y-0"
        )}>
          {/* Timer Section */}
          <div className="space-y-6">
            <div className="flex gap-2">
              {subjects.map((subject) => (
                <Button
                  key={subject}
                  variant={selectedSubject === subject ? "default" : "outline"}
                  onClick={() => {
                    // If we're studying, we need to handle subject switching
                    if (isStudying) {
                      // Save the current session
                      stopStudying().then(() => {
                        // Change the subject
                        setSelectedSubject(subject);
                        // Start a new session with the new subject
                        startNewStudySession();
                      });
                    } else {
                      // If not studying, just change the subject
                      setSelectedSubject(subject);
                    }
                  }}
                  disabled={isStudying && isRunning} // Only disable if actively running
                  className="flex-1"
                >
                  {subject}
                </Button>
              ))}
            </div>

            <div className="text-center py-16 px-8 rounded-lg bg-black w-full max-w-4xl mx-auto mb-8">
              {mode === 'pomodoro' && (
                <div className="text-sm text-muted-foreground mb-4">
                  {currentPhase === 'work' ? 'Work Time' : 'Break Time'}
                </div>
              )}
              <div className="text-[160px] font-bold font-mono mb-8 leading-none">
                {formatTime(currentTime)}
              </div>
              {isStudying ? (
                <div className="flex gap-4 justify-center">
                  <Button
                    variant={isRunning ? "outline" : "default"}
                    size="lg"
                    disabled={loading}
                    className="w-48 h-16 text-lg"
                    onClick={() => {
                      if (isRunning) {
                        // Pause the timer without resetting the session start time
                        pauseTimer();
                        
                        // Store the current subject and elapsed time when pausing
                        localStorage.setItem('pausedSubject', selectedSubject);
                        localStorage.setItem('pausedElapsedTime', totalElapsedTime.toString());
                        
                        toast({
                          title: "Timer Paused",
                          description: "Click Resume to continue studying"
                        });
                      } else {
                        // Check if we're resuming with a different subject
                        const pausedSubject = localStorage.getItem('pausedSubject');
                        
                        if (pausedSubject && pausedSubject !== selectedSubject) {
                          // If switching subjects while paused, save the current session and start a new one
                          stopStudying().then(() => {
                            startNewStudySession();
                          });
                        } else {
                          // Resume the timer with the same subject
                          startTimer(true);
                          toast({
                            title: "Timer Resumed",
                            description: "Study session continued"
                          });
                        }
                      }
                    }}
                  >
                    {isRunning ? "Pause" : "Resume"}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="lg" disabled={loading} className="w-48 h-16 text-lg">
                        Stop Studying
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>End Study Session?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your study time will be saved. Are you sure you want to end this session?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Continue Studying</AlertDialogCancel>
                        <AlertDialogAction onClick={stopStudying} disabled={loading}>
                          End Session
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <Button
                  onClick={startStudying}
                  size="lg"
                  className="w-48 h-16 text-lg"
                  disabled={loading}
                >
                  Start Studying
                </Button>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Today's Progress</h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Study Goals
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-[425px]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Daily Study Goals</AlertDialogTitle>
                    <AlertDialogDescription>
                      Set your target study hours for each subject.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="grid gap-6 py-4">
                    {subjects.map((subject) => (
                      <div key={subject} className="grid gap-2">
                        <Label htmlFor={subject} className="font-medium">
                          {subject}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={subject}
                            type="number"
                            value={targetTimes[subject] / 60 / 60}
                            onChange={(e) => handleTargetTimeChange(subject, Math.max(0, parseFloat(e.target.value) || 0) * 60 * 60)}
                            className="w-20"
                            min="0"
                            step="0.5"
                          />
                          <span className="text-muted-foreground">hours</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>Physics <span className="text-muted-foreground">Goal: {formatTime(targetTimes.Physics)}</span></div>
                <div>{formatTime(subjectProgress.Physics * 60 * 60)} {Math.round((subjectProgress.Physics / (targetTimes.Physics / 60 / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Physics / (targetTimes.Physics / 60 / 60)) * 100} />

              <div className="flex justify-between items-center">
                <div>Chemistry <span className="text-muted-foreground">Goal: {formatTime(targetTimes.Chemistry)}</span></div>
                <div>{formatTime(subjectProgress.Chemistry * 60 * 60)} {Math.round((subjectProgress.Chemistry / (targetTimes.Chemistry / 60 / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Chemistry / (targetTimes.Chemistry / 60 / 60)) * 100} />

              <div className="flex justify-between items-center">
                <div>Mathematics <span className="text-muted-foreground">Goal: {formatTime(targetTimes.Mathematics)}</span></div>
                <div>{formatTime(subjectProgress.Mathematics * 60 * 60)} {Math.round((subjectProgress.Mathematics / (targetTimes.Mathematics / 60 / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Mathematics / (targetTimes.Mathematics / 60 / 60)) * 100} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

