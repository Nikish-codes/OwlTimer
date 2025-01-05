"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ExamCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const examDate = new Date('2025-01-22T00:00:00')

    const timer = setInterval(() => {
      const now = new Date()
      const difference = examDate.getTime() - now.getTime()

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })

      if (difference < 0) {
        clearInterval(timer)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return (
    <Card>
      <CardHeader>
        {/* <CardTitle>JEE Mains 2025 Countdown</CardTitle> */}
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <div className="text-4xl font-bold mb-2">JEE Mains 2025 Countdown</div>
          <div className="text-6xl font-bold">
            {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

