"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { format } from 'date-fns';

export function ExamCountdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [examDateString, setExamDateString] = useState<string>('');
  const [isEditingDate, setIsEditingDate] = useState<boolean>(false);

  useEffect(() => {
    // Load saved date from localStorage
    const savedDate = localStorage.getItem('examDate')
    if (savedDate) {
      const parsedDate = new Date(savedDate)
      setExamDate(parsedDate);
      setExamDateString(format(parsedDate, 'yyyy-MM-dd'));
    } else {
      // Set default exam date if nothing is saved
      setExamDate(new Date('2025-04-01T00:00:00'));
      setExamDateString('2025-04-01');
    }
  }, [])

  useEffect(() => {
      if (!examDate) return;
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
  }, [examDate])

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExamDateString(event.target.value);
  };

  const handleDateSave = () => {
    const newDate = new Date(examDateString);
    if (isNaN(newDate.getTime())) {
      // Handle invalid date
      console.error("Invalid date format");
      return;
    }
    setExamDate(newDate);
    localStorage.setItem('examDate', newDate.toISOString());
    setIsEditingDate(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <CardTitle className="text-lg font-bold text-center sm:text-left">
            Exam Countdown
        </CardTitle>
        {isEditingDate ? (
          <Button size="sm" onClick={handleDateSave} className="w-full sm:w-auto">Save</Button>
        ) : (
          <Button size="sm" onClick={() => setIsEditingDate(true)} className="w-full sm:w-auto">Change Date</Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditingDate ? (
          <div className="flex flex-col gap-2">
            <Input
              type="date"
              value={examDateString}
              onChange={handleDateChange}
              className="w-full"
            />
          </div>
        ) : (
        <div className="text-center">
          <div className="text-3xl sm:text-4xl md:text-6xl font-bold break-words">
            {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
