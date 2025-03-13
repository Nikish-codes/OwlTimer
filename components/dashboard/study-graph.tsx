"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StudySession } from '@/types/study-session'

interface StudyGraphProps {
  studySessions: StudySession[]
}

interface SubjectTotals {
  Physics: number
  Chemistry: number
  Mathematics: number
  date: string
}

export function StudyGraph({ studySessions }: StudyGraphProps) {
  const endDate = new Date()
  const startDate = startOfWeek(endDate)

  const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
    const sessions = studySessions.filter(session => 
      format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    )

    const subjectTotals: SubjectTotals = {
      Physics: 0,
      Chemistry: 0,
      Mathematics: 0,
      date: format(date, 'MMM d')
    }

    sessions.forEach(session => {
      const subject = session.subject as 'Physics' | 'Chemistry' | 'Mathematics';
      subjectTotals[subject] += session.duration;
    })

    return subjectTotals
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Study Progress</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Study Time']}
            />
            <Area 
              type="monotone" 
              dataKey="Physics" 
              stackId="1" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
            />
            <Area 
              type="monotone" 
              dataKey="Chemistry" 
              stackId="1" 
              stroke="#22c55e" 
              fill="#22c55e" 
            />
            <Area 
              type="monotone" 
              dataKey="Mathematics" 
              stackId="1" 
              stroke="#eab308" 
              fill="#eab308" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
} 
