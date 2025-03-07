"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useFirebase } from '@/components/firebase-provider'
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc, getDoc, orderBy, onSnapshot } from 'firebase/firestore'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useOfflineStorage } from '@/hooks/use-offline-storage'
// import { StudyAnalytics } from '@/components/study-analytics'
import { toast } from '@/components/ui/use-toast'
// import { useTimer } from '@/components/study-timer-provider'
// import { Separator } from "@/components/ui/separator"
// import { formatTime } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2 } from "lucide-react"

const subjects = ['Physics', 'Chemistry', 'Mathematics'] as const
type Subject = typeof subjects[number]
type StudyTimesType = Record<Subject, number>
type TargetTimesType = Record<Subject, number>

interface StudyTrackerProps {
  expanded?: boolean
}

interface SubjectProgress {
  [key: string]: number;
}

interface StudySession {
  startTime: Date;
  endTime: Date;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Mock';
  userId: string;
}

export function StudyTracker({ expanded = false }: StudyTrackerProps) {
  const { db, user } = useFirebase()
  const { offlineData, updateStudyTime } = useOfflineStorage()
  const [loading, setLoading] = useState(false)
  const [studyTimes, setStudyTimes] = useState<StudyTimesType>({
    Physics: 0,
    Chemistry: 0,
    Mathematics: 0
  })
  const [targetTimes, setTargetTimes] = useState<TargetTimesType>({
    Physics: 120, // Default 2 hours
    Chemistry: 120,
    Mathematics: 120
  })
  // Comment out useTimer usage since this is just a reference file
  /*
  const {
    timer,
    isStudying,
    startStudying,
    stopTimerStudying,
    setTimer,
    timerType,
    isPaused,
    pauseTimer,
    resumeTimer,
    startMockTest,
    selectedSubject,
    setSelectedSubject
  } = useTimer()
  */
  
  // Define mock values for the timer context
  const timer = 0;
  const isStudying = false;
  const startStudying = (subject: string) => { console.log('Start studying', subject); };
  const stopTimerStudying = async () => { console.log('Stop studying'); };
  const setTimer = (value: number) => { console.log('Set timer', value); };
  const timerType = 'focus' as 'focus' | 'mock_test';
  const isPaused = false;
  const pauseTimer = () => { console.log('Pause timer'); };
  const resumeTimer = () => { console.log('Resume timer'); };
  const startMockTest = () => { console.log('Start mock test'); };
  const selectedSubject = 'Physics';
  const setSelectedSubject = (subject: string) => { console.log('Set subject', subject); };
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress>({
    Physics: 0,
    Chemistry: 0,
    Mathematics: 0,
    Mock: 0
  });
  const [sessionTime, setSessionTime] = useState<number>(0);
    const [progressInitialized, setProgressInitialized] = useState(false);

  // Load study times and target times from database or local storage
  useEffect(() => {
    if (user) {
      loadStudyTimes()
      loadTargetTimes()
    } else {
      setStudyTimes(offlineData.studyTime as StudyTimesType)
      const savedTargets = localStorage.getItem('target_times')
      if (savedTargets) {
        setTargetTimes(JSON.parse(savedTargets))
      }
    }
  }, [user, offlineData.studyTime])

  // Update session time as timer updates
  useEffect(() => {
    if (isStudying) {
      setSessionTime(Math.floor(timer / 60));
    }
  }, [timer, isStudying]);

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

  const loadTargetTimes = async () => {
    try {
      if (!user) return
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      if (userData?.targetTimes) {
        setTargetTimes(userData.targetTimes)
      }
    } catch (error) {
      console.error('Error loading target times:', error)
    }
  }

  const handleTargetTimeChange = async (subject: Subject, minutes: number) => {
    const newTargetTimes = { ...targetTimes, [subject]: minutes }
    setTargetTimes(newTargetTimes)

    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid)
        await updateDoc(userRef, {
          targetTimes: newTargetTimes
        })
      } catch (error) {
        console.error('Error saving target time:', error)
      }
    } else {
      localStorage.setItem('target_times', JSON.stringify(newTargetTimes))
    }
  }

  const handleStartStudying = () => {
    startStudying(selectedSubject)
    toast({
      title: "Study session started",
      description: `Subject: ${selectedSubject}`
    })
  }

  const handleStopStudying = async () => {
    setLoading(true)
    try {
      await stopTimerStudying()
      const minutes = sessionTime

      if (minutes === 0) {
        toast({
          title: "Session too short",
          description: "Study for at least a minute to record the session",
          variant: "destructive"
        })
        return
      }

      if (user) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - timer * 1000);

        // Add study session record first
        await addDoc(collection(db, 'study-sessions'), {
          userId: user.uid,
          subject: selectedSubject,
          duration: minutes,
          type: timerType,
          startTime,
          endTime,
          timestamp: endTime.toISOString(),
          date: endTime.toISOString(),
          createdAt: endTime.toISOString(),
          username: user.displayName || 'Anonymous'
        })

        // Then update user's total study times
        const userRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userRef)
        const userData = userDoc.data()

        const currentSubjectStudyTime = userData?.studyTimes?.[selectedSubject] || 0;
        await updateDoc(userRef, {
          studyTimes: {
            ...userData?.studyTimes,
            [selectedSubject]: currentSubjectStudyTime + minutes,
          },
          totalStudyTime: (userData?.totalStudyTime || 0) + minutes,
          username: user.displayName || 'Anonymous'
        })

        // The real-time listener will handle progress updates
        await loadStudyTimes()
      } else {
        updateStudyTime(selectedSubject, minutes)
      }


      toast({
        title: "Study session saved",
        description: `Added ${minutes} minutes to ${selectedSubject}`
      })
    } catch (error) {
      console.error('Error saving session:', error)
      toast({
        title: "Error saving session",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setTimer(0)
      setSessionTime(0)
    }
  }

  const loadTodayProgress = async () => {
    if (!user || !db) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sessionsQuery = query(
        collection(db, 'study-sessions'),
        where('userId', '==', user.uid),
        where('date', '>=', today.toISOString()),
        orderBy('date', 'desc')
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
        const sessions = snapshot.docs.map(doc => doc.data());

        // Calculate today's progress for each subject
        const progress: SubjectProgress = {
          Physics: 0,
          Chemistry: 0,
          Mathematics: 0,
          Mock: 0
        };

        // Only count completed sessions, not the ongoing one
        sessions.forEach(session => {
            const duration = session.duration || 0;
            if (session.subject in progress) {
              progress[session.subject] += duration / 60; // Convert minutes to hours
            }
        });

        setSubjectProgress(progress);
      }, (error) => {
        console.error('Error loading today\'s progress:', error);
      });
      setProgressInitialized(true)

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading today\'s progress:', error);
    }
  };

    useEffect(() => {
        loadTodayProgress();
    }, [user, db]);

    useEffect(() => {
        if (!isStudying && progressInitialized) {
            loadTodayProgress()
        }
    }, [isStudying])


  return (
    <Card className={expanded ? "h-full" : undefined}>
      <CardHeader>
        <CardTitle>Study Tracker</CardTitle>
      </CardHeader>
      <CardContent>
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
                  onClick={() => setSelectedSubject(subject)}
                  disabled={isStudying}
                  className="flex-1"
                >
                  {subject}
                </Button>
              ))}
            </div>

            <div className="text-center py-8 px-4 rounded-lg bg-black">
              <div className="text-4xl font-bold font-mono mb-4">
                {formatTime(timer)}
                {timerType === 'mock_test' && (
                  <div className="text-sm mt-2">
                    Time Remaining: {formatTime(3 * 60 * 60 - timer)}
                  </div>
                )}
              </div>
              {isStudying ? (
                <div className="space-y-4">
                  <div className="space-x-4">
                    {isPaused ? (
                      <Button onClick={resumeTimer}>Resume</Button>
                    ) : (
                      <Button onClick={pauseTimer}>Pause</Button>
                    )}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="lg" disabled={loading}>
                        {timerType === 'mock_test' ? 'End Test' : 'Stop Studying'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {timerType === 'mock_test' ? 'End Mock Test?' : 'End Study Session?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Your {timerType === 'mock_test' ? 'test' : 'study'} time will be saved. Are you sure you want to end this session?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Continue</AlertDialogCancel>
                        <AlertDialogAction onClick={handleStopStudying} disabled={loading}>
                          End Session
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button
                    onClick={handleStartStudying}
                    size="lg"
                    className="w-[140px]"
                    disabled={loading}
                  >
                    Start Studying
                  </Button>
                  <div>
                    <Button
                      onClick={startMockTest}
                      size="lg"
                      variant="outline"
                      className="w-[140px]"
                      disabled={loading}
                    >
                      Mock Test
                    </Button>
                  </div>
                </div>
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
                            value={targetTimes[subject] / 60}
                            onChange={(e) => handleTargetTimeChange(subject, Math.max(0, parseFloat(e.target.value) || 0) * 60)}
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
                <div>{formatTime(subjectProgress.Physics * 60)} {Math.round((subjectProgress.Physics / (targetTimes.Physics / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Physics / (targetTimes.Physics / 60)) * 100} />

              <div className="flex justify-between items-center">
                <div>Chemistry <span className="text-muted-foreground">Goal: {formatTime(targetTimes.Chemistry)}</span></div>
                <div>{formatTime(subjectProgress.Chemistry * 60)} {Math.round((subjectProgress.Chemistry / (targetTimes.Chemistry / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Chemistry / (targetTimes.Chemistry / 60)) * 100} />

              <div className="flex justify-between items-center">
                <div>Mathematics <span className="text-muted-foreground">Goal: {formatTime(targetTimes.Mathematics)}</span></div>
                <div>{formatTime(subjectProgress.Mathematics * 60)} {Math.round((subjectProgress.Mathematics / (targetTimes.Mathematics / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Mathematics / (targetTimes.Mathematics / 60)) * 100} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Define formatTime function locally since it's not exported from utils
const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
