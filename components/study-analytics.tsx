"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { useFirebase } from './firebase-provider'
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { Brain, Timer, Trophy, Clock, Target } from "lucide-react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Script from 'next/script'
import ReactApexChart from 'react-apexcharts'
import { ApexOptions } from 'apexcharts'

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
  const [isBrowser, setIsBrowser] = useState(false)

  // Add custom CSS for ApexCharts tooltips
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Add custom CSS for tooltips
      const style = document.createElement('style');
      style.innerHTML = `
        .apexcharts-tooltip {
          background: #1e293b !important;
          color: #f8fafc !important;
          border: none !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
          border-radius: 0.5rem !important;
          padding: 0.5rem !important;
        }
        .apexcharts-tooltip-title {
          background: #334155 !important;
          color: #f8fafc !important;
          border-bottom: 1px solid #475569 !important;
          padding: 0.5rem !important;
          margin-bottom: 0.5rem !important;
        }
        .apexcharts-tooltip-series-group {
          padding: 0.25rem 0.5rem !important;
        }
        .apexcharts-tooltip-text-y-value, 
        .apexcharts-tooltip-text-y-label,
        .apexcharts-tooltip-text-z-value {
          color: #f8fafc !important;
        }
        .apexcharts-tooltip-marker {
          margin-right: 0.5rem !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Check if we're in the browser
  useEffect(() => {
    setIsBrowser(true)
  }, [])

  useEffect(() => {
    if (user && db) {
      const sessionsRef = collection(db, 'studySessions')
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      )
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sessionData = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            userId: data.userId,
            subject: data.subject,
            duration: data.duration,
            type: data.type,
            date: data.date,
            timestamp: data.timestamp?.toDate?.() || new Date(),
            createdAt: data.createdAt
          } as StudySession
        })
        setSessions(sessionData)
        setLoading(false)
      })

      // Add event listener for session updates
      const handleSessionSaved = () => {
        console.log('Study session saved, refreshing analytics...')
        // The onSnapshot will automatically update when data changes
      }
      
      window.addEventListener('study-session-saved', handleSessionSaved)
      
      return () => {
        unsubscribe()
        window.removeEventListener('study-session-saved', handleSessionSaved)
      }
    }
  }, [user, db])

  // Calculate date range
  const endDate = new Date()
  const startDate = timeRange === 'week' 
    ? startOfWeek(endDate)
    : new Date(endDate.getFullYear(), endDate.getMonth(), 1) // First day of current month

  // Filter sessions by date range and subject
  const filteredSessions = sessions.filter(session => {
    // Convert timestamp to date object if it's not already
    const sessionDate = session.timestamp instanceof Date ? session.timestamp : new Date(session.timestamp)
    const sessionDateStr = format(sessionDate, 'yyyy-MM-dd')
    const startDateStr = format(startDate, 'yyyy-MM-dd')
    const endDateStr = format(endDate, 'yyyy-MM-dd')
    
    // Check if the session date is within the selected range
    const matchesDate = sessionDateStr >= startDateStr && sessionDateStr <= endDateStr
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

  // Remove the sample data function
  const hasStudyData = subjectData.length > 0;

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
        .reduce((sum, session) => sum + session.duration, 0),
      Biology: filteredSessions
        .filter(session => 
          session.subject === 'Biology' && 
          format(session.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        .reduce((sum, session) => sum + session.duration, 0)
    }
  })

  // Prepare data for ApexCharts
  const columnChartOptions: ApexOptions = {
    colors: ["#4f46e5", "#06b6d4", "#10b981", "#8b5cf6"],
    chart: {
      type: "bar" as const,
      height: 320,
      fontFamily: "Inter, sans-serif",
      toolbar: {
        show: false,
      },
      foreColor: '#64748b', // Text color for axis labels
      background: 'transparent',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%",
        borderRadiusApplication: "end",
        borderRadius: 8,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      style: {
        fontFamily: "Inter, sans-serif",
      },
      y: {
        formatter: function(value: number) {
          return `${Math.floor(value / 60)}h ${value % 60}m`;
        }
      },
      theme: 'dark',
      fillSeriesColor: false,
      marker: {
        show: true,
      },
    },
    states: {
      hover: {
        filter: {
          type: "darken",
          value: 1,
        },
      },
    },
    stroke: {
      show: true,
      width: 0,
      colors: ["transparent"],
    },
    grid: {
      show: false,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: -14
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: true,
      position: 'top',
      fontFamily: "Inter, sans-serif",
    },
    xaxis: {
      categories: dailyData.map(day => day.date),
      floating: false,
      labels: {
        show: true,
        style: {
          fontFamily: "Inter, sans-serif",
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400'
        }
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        formatter: function(value: number) {
          return `${Math.floor(value / 60)}h ${value % 60}m`;
        }
      }
    },
    fill: {
      opacity: 1,
    },
  };

  const columnChartSeries = [
    {
      name: "Physics",
      data: dailyData.map(day => day.Physics)
    },
    {
      name: "Chemistry",
      data: dailyData.map(day => day.Chemistry)
    },
    {
      name: "Mathematics",
      data: dailyData.map(day => day.Mathematics)
    },
    {
      name: "Biology",
      data: dailyData.map(day => day.Biology)
    }
  ];

  const lineChartOptions: ApexOptions = {
    chart: {
      height: 320,
      type: "line" as const,
      fontFamily: "Inter, sans-serif",
      dropShadow: {
        enabled: false,
      },
      toolbar: {
        show: false,
      },
      foreColor: '#64748b', // Text color for axis labels
      background: 'transparent',
    },
    tooltip: {
      enabled: true,
      y: {
        formatter: function(value: number) {
          return `${Math.floor(value / 60)}h ${value % 60}m`;
        }
      },
      x: {
        show: true,
      },
      theme: 'dark',
      fillSeriesColor: false,
      marker: {
        show: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      width: 3,
      curve: 'smooth'
    },
    grid: {
      show: true,
      strokeDashArray: 4,
      padding: {
        left: 2,
        right: 2,
        top: -26
      },
    },
    legend: {
      show: true,
      position: 'top',
    },
    xaxis: {
      categories: dailyData.map(day => day.date),
      labels: {
        show: true,
        style: {
          fontFamily: "Inter, sans-serif",
          cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400'
        }
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        formatter: function(value: number) {
          return `${Math.floor(value / 60)}h ${value % 60}m`;
        }
      }
    },
  };

  const lineChartSeries = [
    {
      name: "Study Time",
      data: dailyData.map(day => day.minutes)
    }
  ];

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

            <Select value={selectedSubject} onValueChange={(value: string) => setSelectedSubject(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Chemistry">Chemistry</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="Biology">Biology</SelectItem>
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

            {/* Study Time Chart - ApexCharts Column Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Study Time Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {isBrowser && hasStudyData ? (
                  // @ts-ignore
                  <ReactApexChart
                    options={columnChartOptions}
                    series={columnChartSeries}
                    type="bar"
                    height={320}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full flex-col gap-4">
                    <p className="text-muted-foreground text-center">No study data available for this time period</p>
                    <p className="text-sm text-muted-foreground text-center">Complete some study sessions to see your study time distribution</p>
                  </div>
                )}
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
                {hasStudyData ? (
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
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full flex-col gap-4">
                    <p className="text-muted-foreground text-center">No study data available for this time period</p>
                    <p className="text-sm text-muted-foreground text-center">Complete some study sessions to see your subject distribution</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subject Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hasStudyData ? (
                // Show real data if available
                ['Physics', 'Chemistry', 'Mathematics', 'Biology'].filter(subject => {
                  // Only show Biology if in PCB mode or if there's study data for it
                  if (subject === 'Biology') {
                    return filteredSessions.some(s => s.subject === 'Biology');
                  }
                  return true;
                }).map(subject => {
                  const subjectTotal = filteredSessions
                    .filter(s => s.subject === subject)
                    .reduce((sum, s) => sum + s.duration, 0)
                  
                  // Skip subjects with no study time
                  if (subjectTotal === 0) return null;
                  
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
                }).filter(Boolean)
              ) : (
                // Show message when no data is available
                <div className="col-span-3 text-center py-8">
                  <p className="text-muted-foreground">No study data available for any subjects</p>
                  <p className="text-sm text-muted-foreground mt-2">Start studying to track your progress across subjects</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Daily Trends - ApexCharts Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Study Pattern</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                {isBrowser && hasStudyData ? (
                  // @ts-ignore
                  <ReactApexChart
                    options={lineChartOptions}
                    series={lineChartSeries}
                    type="line"
                    height={320}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full flex-col gap-4">
                    <p className="text-muted-foreground text-center">No study data available for this time period</p>
                    <p className="text-sm text-muted-foreground text-center">Complete some study sessions to see your daily study pattern</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Study Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Study Session Types</CardTitle>
              </CardHeader>
              <CardContent>
                {hasStudyData ? (
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
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No study session data available</p>
                    <p className="text-sm text-muted-foreground mt-2">Start studying to see your session type breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Import the streak calculation function from the library
import { calculateStreaks } from "@/lib/streak-tracking"

// Use the imported function to calculate streak
const calculateStreak = (sessions: StudySession[]): number => {
  if (sessions.length === 0) return 0
  
  // Use the more robust implementation from streak-tracking.ts
  const { currentStreak } = calculateStreaks(sessions)
  return currentStreak
}
