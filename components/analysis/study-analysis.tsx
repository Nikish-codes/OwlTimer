"use client"

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useFirebase } from '../firebase-provider'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { Clock, Timer, Trophy, Target } from 'lucide-react'
import { useToast } from '../ui/use-toast'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
} from 'date-fns'
import { StudySession } from '@/types/study-session'

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#8b5cf6'];

interface SubjectData {
  name: string;
  value: number;
}

interface DailyData {
  date: string;
  [key: string]: string | number;
}

export function StudyAnalytics() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | 'last7days' | 'last30days'>('today');
  const [analyticsData, setAnalyticsData] = useState<{
    totalStudyTime: number,
    averageDaily: number,
    longestSession: number,
    subjectDataArray: SubjectData[],
    dailyData: DailyData[],
    currentStreak: number,
  } | null>(null)
  const { user, db } = useFirebase();
  const { toast } = useToast();

  const calculateDateRange = (timeRange: 'today' | 'last7days' | 'last30days') => {
    const today = startOfDay(new Date());
    let startDate: Date;
    if (timeRange === 'last7days') {
      startDate = subDays(today, 6);
    } else if (timeRange === 'last30days') {
      startDate = subDays(today, 29);
    } else {
      startDate = today;
    }
    return { startDate, endDate: endOfDay(today) };
  };

  const loadSessions = async () => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { startDate, endDate } = calculateDateRange(timeRange);
      const sessionsRef = collection(db, 'study-sessions');
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid),
        where('date', '>=', startDate.toISOString()),
        where('date', '<=', endDate.toISOString()),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);

      const sessionsData = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        startTime: new Date(doc.data().startTime),
        endTime: new Date(doc.data().endTime),
      })) as StudySession[];
      setSessions(sessionsData);
    } catch (error: any) {
      toast({
        title: 'Error loading study sessions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [user, db, timeRange]);

  useEffect(() => {
    if (sessions.length > 0) {
      const totalStudyTime = sessions.reduce((acc, session) => {
        const duration = session.duration;
        return acc + duration;
      }, 0);

      const dailyStudyTime = sessions.reduce((acc, session) => {
        const date = format(new Date(session.date), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + session.duration;
        return acc;
      }, {} as Record<string, number>);

      const dailyData = Object.entries(dailyStudyTime).map(([date, _]) => {
        const daily: DailyData = {
          date: format(new Date(date), 'MMM d'),
          Physics: 0,
          Chemistry: 0,
          Mathematics: 0,
          Mock: 0,
        };

        sessions.forEach(session => {
          if (format(new Date(session.date), 'yyyy-MM-dd') === date) {
            daily[session.subject] = (daily[session.subject] as number) + session.duration;
          }
        });

        return daily;
      });

      const averageDaily = totalStudyTime / (Object.keys(dailyStudyTime).length || 1);

      const longestSession = sessions.reduce((max, session) => {
        return Math.max(max, session.duration);
      }, 0);

      const subjectData = sessions.reduce((acc, session) => {
        acc[session.subject] = (acc[session.subject] || 0) + session.duration;
        return acc;
      }, {} as Record<string, number>);

      const subjectDataArray: SubjectData[] = Object.entries(subjectData).map(([name, value]) => ({
        name,
        value,
      }));

      subjectDataArray.sort((a, b) => b.value - a.value);
        // Example streak calculation (simplified)
      let currentStreak = 0;
      if (dailyData.length > 0) {
        currentStreak = dailyData.length; // Simplified, assuming every day has a study session
      }

      setAnalyticsData({
        totalStudyTime,
        averageDaily,
        longestSession,
        subjectDataArray,
        dailyData,
        currentStreak
      })
    } else {
      setAnalyticsData(null)
    }
  }, [sessions])

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!analyticsData) {
    return <div>No data to display.</div>;
  }

  const { totalStudyTime, averageDaily, longestSession, subjectDataArray, dailyData, currentStreak } = analyticsData;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select
          onValueChange={(value) => setTimeRange(value as 'today' | 'last7days' | 'last30days')}
          value={timeRange}
        >
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(totalStudyTime / 60)}:{(totalStudyTime % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.floor(averageDaily / 60)}:{Math.round(averageDaily % 60).toString().padStart(2, '0')} daily average
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
              {Math.floor(longestSession / 60)}:{(longestSession % 60).toString().padStart(2, '0')}
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
              {subjectDataArray[0]?.name || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {subjectDataArray[0]
                ? `${Math.floor(subjectDataArray[0].value / 60)}:${(subjectDataArray[0].value % 60).toString().padStart(2, '0')} total`
                : 'No data available'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  formatter={(value: number, name: string) => [
                    `${Math.floor(value / 60)}:${(value % 60).toString().padStart(2, '0')}`,
                    name,
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Bar dataKey="Physics" fill="#4f46e5" name="Physics" />
                <Bar dataKey="Chemistry" fill="#06b6d4" name="Chemistry" />
                <Bar dataKey="Mathematics" fill="#10b981" name="Mathematics" />
                <Bar dataKey="Mock" fill="#8b5cf6" name="Mock Tests" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Subject Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectDataArray}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name} (${Math.floor(value / 60)}h ${value % 60}m)`}
                >
                  {subjectDataArray.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${Math.floor(value / 60)}h ${value % 60}m`, 'Study Time']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
