"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useFirebase } from './firebase-provider'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { Brain, Timer, Trophy, Clock, Target, TrendingUp } from "lucide-react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type StudySession = {
  subject: string;
  duration: number;
  timestamp: Date;
  type: 'focus' | 'pomodoro' | 'break';
}

const COLORS = ['#4f46e5', '#06b6d4', '#10b981']

export function StudyAnalytics() {
  const { db, user } = useFirebase()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user])

  const loadSessions = async () => {
    if (!user || !db) return
    
    const sessionsRef = collection(db, 'studySessions')
    const q = query(
      sessionsRef,
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    )
    
    const snapshot = await getDocs(q)
    const sessionData: StudySession[] = []
    snapshot.forEach(doc => {
      const data = doc.data()
      sessionData.push({
        ...data,
        timestamp: new Date(data.timestamp)
      } as StudySession)
    })
    
    setSessions(sessionData)
    setLoading(false)
  }

  // Calculate date range
  const endDate = new Date()
  const startDate = timeRange === 'week' 
    ? startOfWeek(endDate)
    : new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  // Filter sessions by date range and subject
  const filteredSessions = sessions.filter(session => {
    const matchesDate = session.timestamp >= startDate && session.timestamp <= endDate
    const matchesSubject = selectedSubject === 'all' || session.subject === selectedSubject
    return matchesDate && matchesSubject
  })

  // Calculate statistics
  const totalStudyTime = filteredSessions.reduce((sum, session) => sum + session.duration, 0)
  const averageDaily = totalStudyTime / eachDayOfInterval({ start: startDate, end: endDate }).length
  const longestSession = Math.max(...filteredSessions.map(s => s.duration), 0)
  const currentStreak = calculateStreak(sessions)

  // Calculate subject breakdown
  const subjectData = Object.entries(
    filteredSessions.reduce((acc, session) => {
      acc[session.subject] = (acc[session.subject] || 0) + session.duration
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  // Prepare daily data
  const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
    const dayTotal = filteredSessions
      .filter(session => format(session.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .reduce((sum, session) => sum + session.duration, 0)
    return {
      date: format(date, 'MMM d'),
      minutes: dayTotal,
      Physics: filteredSessions
        .filter(session => 
          session.subject === 'Physics' && 
          format(session.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        .reduce((sum, session) => sum + session.duration, 0),
      Chemistry: filteredSessions
        .filter(session => 
          session.subject === 'Chemistry' && 
          format(session.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        .reduce((sum, session) => sum + session.duration, 0),
      Mathematics: filteredSessions
        .filter(session => 
          session.subject === 'Mathematics' && 
          format(session.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        .reduce((sum, session) => sum + session.duration, 0)
    }
  })

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <div className="flex gap-4 mt-4">
            <Select value={timeRange} onValueChange={(value: 'week' | 'month') => setTimeRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Chemistry">Chemistry</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
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
                    {Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(averageDaily / 60)}h {Math.round(averageDaily % 60)}m daily average
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Longest Session</CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.floor(longestSession / 60)}h {longestSession % 60}m
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Best focus time
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
                    {currentStreak} days
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consecutive study days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Studied</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {subjectData[0]?.name || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {subjectData[0] 
                      ? `${Math.floor(subjectData[0].value / 60)}h ${subjectData[0].value % 60}m total`
                      : 'No data available'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Study Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Study Time Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Study Time']}
                    />
                    <Bar dataKey="Physics" stackId="a" fill="#4f46e5" />
                    <Bar dataKey="Chemistry" stackId="a" fill="#06b6d4" />
                    <Bar dataKey="Mathematics" stackId="a" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            {/* Subject Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Subject Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, value }) => `${name} (${Math.floor(value / 60)}h ${value % 60}m)`}
                    >
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Study Time']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Physics', 'Chemistry', 'Mathematics'].map(subject => {
                const subjectTotal = filteredSessions
                  .filter(s => s.subject === subject)
                  .reduce((sum, s) => sum + s.duration, 0)
                return (
                  <Card key={subject}>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">{subject}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.floor(subjectTotal / 60)}h {subjectTotal % 60}m
                      </div>
                      <Progress 
                        value={(subjectTotal / totalStudyTime) * 100} 
                        className="mt-2" 
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Daily Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Study Pattern</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Study Time']}
                    />
                    <Bar dataKey="minutes" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Study Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Study Session Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(
                    filteredSessions.reduce((acc, session) => {
                      acc[session.type] = (acc[session.type] || 0) + session.duration
                      return acc
                    }, {} as Record<string, number>)
                  ).map(([type, duration], index) => (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {type === 'focus' ? (
                            <Brain className="h-4 w-4 text-blue-500" />
                          ) : type === 'pomodoro' ? (
                            <Timer className="h-4 w-4 text-red-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-green-500" />
                          )}
                          <span className="capitalize">{type}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {Math.floor(duration / 60)}h {duration % 60}m
                        </span>
                      </div>
                      <Progress value={(duration / totalStudyTime) * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

const calculateStreak = (sessions: StudySession[]): number => {
  if (sessions.length === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const studyDays = new Set(
    sessions.map(session => {
      const date = new Date(session.timestamp)
      date.setHours(0, 0, 0, 0)
      return date.getTime()
    })
  )

  let streak = 0
  let currentDate = today

  while (studyDays.has(currentDate.getTime())) {
    streak++
    currentDate.setDate(currentDate.getDate() - 1)
  }

  return streak
} 