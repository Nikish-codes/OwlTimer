"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useFirebase } from "@/components/firebase-provider"
import { doc, getDoc, setDoc } from 'firebase/firestore'

interface StudyGoal {
  subject: string;
  target: number; // minutes
  progress: number; // minutes
}

export function StudyGoals() {
  const [goals, setGoals] = useState<StudyGoal[]>([
    { subject: 'Physics', target: 60, progress: 0 },
    { subject: 'Chemistry', target: 45, progress: 0 },
    { subject: 'Mathematics', target: 60, progress: 0 },
  ])
  
  const { user, db } = useFirebase()
  
  // Load goals from Firebase
  useEffect(() => {
    if (!user || !db) return
    
    const loadGoals = async () => {
      try {
        const goalsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'goals'))
        if (goalsDoc.exists()) {
          setGoals(goalsDoc.data().goals)
        }
      } catch (error) {
        console.error('Error loading goals:', error)
      }
    }
    
    loadGoals()
  }, [user, db])
  
  // Update goal target
  const updateGoalTarget = (index: number, target: number) => {
    const newGoals = [...goals]
    newGoals[index].target = target
    setGoals(newGoals)
    
    // Save to Firebase
    if (user && db) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'goals'), { goals: newGoals })
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.map((goal, index) => (
            <div key={goal.subject} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{goal.subject}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={goal.target}
                    onChange={(e) => updateGoalTarget(index, parseInt(e.target.value) || 0)}
                    className="w-20 text-right"
                    min={0}
                  />
                  <span className="text-sm">min</span>
                </div>
              </div>
              <Progress value={(goal.progress / goal.target) * 100} className="h-2" />
              <div className="text-xs text-right text-muted-foreground">
                {goal.progress}/{goal.target} minutes
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 