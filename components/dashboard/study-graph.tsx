"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, isBefore, addWeeks } from 'date-fns'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StudySession } from '@/types/study-session'
import { useState } from 'react'

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
  const [weeksOffset, setWeeksOffset] = useState(0);

  const endDate = addWeeks(new Date(), weeksOffset);
  const startDate = startOfWeek(endDate);
  const displayedDates = eachDayOfInterval({ start: startDate, end: endDate });

  const dailyData = displayedDates.map(date => {
    const sessions = studySessions.filter(session =>
      format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    const subjectTotals: SubjectTotals = {
      Physics: 0,
      Chemistry: 0,
      Mathematics: 0,
      date: format(date, 'MMM d')
    };

    sessions.forEach(session => {
      const subject = session.subject as 'Physics' | 'Chemistry' | 'Mathematics';
      subjectTotals[subject] += session.duration;
    })

    return subjectTotals
  })

  const handlePrevWeek = () => {
    setWeeksOffset(weeksOffset - 1);
  };

  const handleNextWeek = () => {
    setWeeksOffset(weeksOffset + 1);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Study Progress</CardTitle>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            disabled={weeksOffset === -2}
            className="px-2 py-1 text-sm border rounded-md"
          >
            &lt;
          </button>
          <button onClick={handleNextWeek} className="px-2 py-1 text-sm border rounded-md">
            &gt;
          </button>
        </div>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => `${value / 60}h`}
              domain={[0, 'dataMax + 100']}
              />
            <Tooltip
              formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Study Time']}
              labelFormatter={(label) => `Date: ${label}`}
              />
            <Area
              type="monotone"
              dataKey="Physics"
              stackId="1"
              stroke="#3b82f6"
              fill="#3b82f6"
              name="Physics"
            />
            <Area
              type="monotone"
              dataKey="Chemistry"
              stackId="1"
              stroke="#22c55e"
              fill="#22c55e"
              name="Chemistry"
            />
            <Area
              type="monotone"
              dataKey="Mathematics"
              stackId="1"
              stroke="#eab308"
              fill="#eab308"
              name="Mathematics"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
