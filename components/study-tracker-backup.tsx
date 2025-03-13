"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/components/firebase-provider"
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useOfflineStorage } from '@/hooks/use-offline-storage'
import { StudyAnalytics } from "@/components/study-analytics"
import { toast } from '@/components/ui/use-toast'
import { useTimer } from "@/components/study-timer-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const [timer, setTimer] = useState(0)
  const [loading, setLoading] = useState(false)
  const [studyTimes, setStudyTimes] = useState<StudyTimesType>({
    Physics: 0,
    Chemistry: 0,
    Mathematics: 0
  })

  // Load study times from database or local storage
  useEffect(() => {
    if (user) {
      loadStudyTimes()
    } else {
      setStudyTimes(offlineData.studyTime as StudyTimesType)
    }
  }, [user, offlineData.studyTime])

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

  const startStudying = () => {
    setIsStudying(true)
    setTimer(0)
    toast({
      title: "Study session started",
      description: `Subject: ${selectedSubject}`
    })
  }

  const stopStudying = async () => {
    setLoading(true)
    try {
      setIsStudying(false)
      const minutes = Math.floor(timer / 60)
      
      if (minutes === 0) {
        toast({
          title: "Session too short",
          description: "Study for at least a minute to record the session",
          variant: "destructive"
        })
        return
      }

      if (user) {
        // Update database
        const userRef = doc(db, 'users', user.uid)
        const userDoc = await getDoc(userRef)
        const userData = userDoc.data()
        
        // Update user's study times
        await updateDoc(userRef, {
          studyTimes: {
            ...userData?.studyTimes,
            [selectedSubject]: (userData?.studyTimes?.[selectedSubject] || 0) + minutes
          },
          totalStudyTime: (userData?.totalStudyTime || 0) + minutes,
          username: user.displayName || 'Anonymous'  // Ensure username is set
        })

        // Add study session record
        await addDoc(collection(db, 'studySessions'), {
          userId: user.uid,
          subject: selectedSubject,
          duration: minutes,
          type: 'focus',
          timestamp: new Date().toISOString(),
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })

        loadStudyTimes()
      } else {
        // Update local storage
        updateStudyTime(selectedSubject, minutes)
      }

      toast({
        title: "Study session saved",
        description: `Added ${minutes} minutes to ${selectedSubject}`
      })
    } catch (error) {
      toast({
        title: "Error saving session",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setTimer(0)
    }
  }

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isStudying) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isStudying])

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
              </div>
              {isStudying ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg" disabled={loading}>
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
              ) : (
                <Button 
                  onClick={startStudying} 
                  size="lg" 
                  className="w-[140px]"
                  disabled={loading}
                >
                  Start Studying
                </Button>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <h3 className="font-semibold mb-2">Today's Progress</h3>
            {subjects.map((subject) => (
              <div key={subject} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{subject}</span>
                  <span>{Math.floor(studyTimes[subject] || 0)} minutes</span>
                </div>
                <Progress 
                  value={((studyTimes[subject] || 0) / 120) * 100} 
                  className="h-2"
                />
              </div>
            ))}
          </div>

          {/* Analytics Section removed from Study Timer page */}
        </div>
      </CardContent>
    </Card>
  )
}

