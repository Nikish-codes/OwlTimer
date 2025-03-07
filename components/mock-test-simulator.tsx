"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function MockTestSimulator() {
  const [testInProgress, setTestInProgress] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 3 hours in minutes

  const startTest = () => {
    setTestInProgress(true)
    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer)
          setTestInProgress(false)
          return 0
        }
        return prevTime - 1
      })
    }, 60000) // Update every minute
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mock Test Simulator</CardTitle>
      </CardHeader>
      <CardContent>
        {!testInProgress ? (
          <Button onClick={startTest}>Start Mock Test</Button>
        ) : (
          <div>
            <div className="text-2xl font-bold mb-4">Time Remaining: {formatTime(timeLeft)}</div>
            <Button variant="outline">Submit Test</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

