"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StudySession } from "@/types/study-session"
import { calculateStudyStats } from "@/lib/study-analytics"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from "date-fns"
import { Brain, Timer, Trophy, Clock, Coffee, TrendingUp } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useState } from 'react';

interface StudyAnalyticsProps {
  sessions: StudySession[]
}

export function StudyAnalytics({ sessions }: StudyAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'last7days' | 'last30days'>('today');
  const stats = calculateStudyStats(sessions)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
          </TabsList>
          <Select onValueChange={(value) => setTimeRange(value as 'today' | 'last7days' | 'last30days')} value={timeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>


      <TabsContent value="overview" className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(stats.totalTime / 60)}h {stats.totalTime % 60}m
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Session</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.averageSessionLength)}m
            </div>
            <p className="text-xs text-muted-foreground">
              Per study session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.streakCount} days
            </div>
            <p className="text-xs text-muted-foreground">
              Consecutive study days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Study Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.bestDay.minutes}m
            </div>
            <p className="text-xs text-muted-foreground">
              {format(stats.bestDay.date, 'MMM d')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyProgress}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(date, 'EEE')}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date) => format(date, 'MMM d')}
                  formatter={(value) => [`${value} minutes`, 'Study Time']}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="rgb(59, 130, 246)" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Subject & Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Subject Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.subjectBreakdown).map(([subject, minutes]) => (
                <div key={subject} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <span>{subject}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {Math.floor(minutes / 60)}h {minutes % 60}m
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.typeBreakdown).map(([type, minutes]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {type === 'pomodoro' ? (
                      <Timer className="h-4 w-4 text-red-500" />
                    ) : type === 'focus' ? (
                      <Brain className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Coffee className="h-4 w-4 text-green-500" />
                    )}
                    <span className="capitalize">{type}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {Math.floor(minutes / 60)}h {minutes % 60}m
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </TabsContent>
    <TabsContent value="subjects">
      <Card>
      <CardHeader>
        <CardTitle>Subject Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
        {Object.entries(stats.subjectBreakdown).map(([subject, minutes]) => (
          <div key={subject} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <span>{subject}</span>
          </div>
          <span className="text-muted-foreground">
            {Math.floor(minutes / 60)}h {minutes % 60}m
          </span>
          </div>
        ))}
        </div>
      </CardContent>
      </Card>
    </TabsContent>
    </Tabs>
  </div>
  )
}