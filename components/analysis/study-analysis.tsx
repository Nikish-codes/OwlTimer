"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { StudySession } from '@/types/study-session'
import { Todo } from '@/types/todo'
import { Clock, Target, TrendingUp, CheckCircle2, Calendar } from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { calculateStreaks } from '@/lib/streak-tracking'

interface StudyAnalysisProps {
  studySessions: StudySession[]
  tasks: Todo[]
}

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6']

export function StudyAnalysis({ studySessions, tasks }: StudyAnalysisProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week')
  const [subject, setSubject] = useState<string>('all')

  // Calculate date range
  const endDate = new Date()
  const startDate = timeRange === 'week' 
    ? startOfWeek(endDate)
    : startOfMonth(endDate)

  // Filter data by date range and subject
  const filteredSessions = studySessions.filter(session => {
    const sessionDate = new Date(session.date)
    const matchesDate = sessionDate >= startDate && sessionDate <= endDate
    const matchesSubject = subject === 'all' || session.subject === subject
    return matchesDate && matchesSubject
  })

  // Calculate statistics
  const totalStudyTime = filteredSessions.reduce((sum, session) => sum + session.duration, 0)
  const averageDaily = totalStudyTime / eachDayOfInterval({ start: startDate, end: endDate }).length
  const completedTasks = tasks.filter(task => task.completed && new Date(task.completedAt!) >= startDate).length
  const totalTasks = tasks.filter(task => new Date(task.createdAt) >= startDate).length
  const completionRate = totalTasks ? (completedTasks / totalTasks) * 100 : 0

  // Prepare chart data
  const dailyData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
    const dayTotal = filteredSessions
      .filter(session => format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .reduce((sum, session) => sum + session.duration, 0)
    return {
      date: format(date, 'MMM d'),
      minutes: dayTotal,
      Physics: filteredSessions
        .filter(session => 
          session.subject === 'Physics' && 
          format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        .reduce((sum, session) => sum + session.duration, 0),
      Chemistry: filteredSessions
        .filter(session => 
          session.subject === 'Chemistry' && 
          format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        .reduce((sum, session) => sum + session.duration, 0),
      Mathematics: filteredSessions
        .filter(session => 
          session.subject === 'Mathematics' && 
          format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        .reduce((sum, session) => sum + session.duration, 0)
    }
  })

  // Subject distribution data
  const subjectData = Object.entries(
    filteredSessions.reduce((acc, session) => {
      acc[session.subject] = (acc[session.subject] || 0) + session.duration
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }))

  // Additional calculations for tasks tab
  const tasksBySubject = tasks.reduce((acc, task) => {
    acc[task.subject] = acc[task.subject] || { total: 0, completed: 0 }
    acc[task.subject].total++
    if (task.completed) acc[task.subject].completed++
    return acc
  }, {} as Record<string, { total: number, completed: number }>)

  // Task completion trend data
  const taskTrendData = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
    const dayTasks = tasks.filter(task => {
      const taskDate = task.completedAt ? new Date(task.completedAt) : null
      return taskDate && format(taskDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
    return {
      date: format(date, 'MMM d'),
      completed: dayTasks.length
    }
  })

  // Add streak calculation using the streak-tracking utility
  const { currentStreak } = calculateStreaks(studySessions)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
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

            <Select value={subject} onValueChange={setSubject}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(averageDaily / 60)}h {Math.round(averageDaily % 60)}m daily average
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
                  <Progress value={completionRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Most Studied</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {subjectData.length > 0 ? subjectData[0].name : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {subjectData.length > 0 
                      ? `${Math.floor(subjectData[0].value / 60)}h ${subjectData[0].value % 60}m total`
                      : 'No data available'}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {currentStreak} days
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current streak
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
                    <CartesianGrid strokeDasharray="3 3" />
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
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
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

            {/* Subject-specific stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Physics', 'Chemistry', 'Mathematics'].map(subj => {
                const subjSessions = filteredSessions.filter(s => s.subject === subj)
                const subjTotal = subjSessions.reduce((sum, s) => sum + s.duration, 0)
                return (
                  <Card key={subj}>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">{subj}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.floor(subjTotal / 60)}h {subjTotal % 60}m
                      </div>
                      <Progress 
                        value={(subjTotal / totalStudyTime) * 100} 
                        className="mt-2" 
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={taskTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tasks by Subject</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {Object.entries(tasksBySubject).map(([subject, stats]) => (
                        <div key={subject} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{subject}</Badge>
                              <span className="text-sm font-medium">
                                {stats.completed}/{stats.total} completed
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {Math.round((stats.completed / stats.total) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(stats.completed / stats.total) * 100}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Completed Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {tasks
                      .filter(task => task.completed)
                      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
                      .slice(0, 10)
                      .map(task => (
                        <div 
                          key={task.id} 
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{task.text}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{task.subject}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(task.completedAt!), 'MMM d')}
                            </span>
                          </div>
                        </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 
