"use client"

import { useState } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ListTodo, BarChart2, Settings, Menu, Timer, Trophy, Quote } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useFirebase } from './firebase-provider'
import { TodoList } from './todo-list'
import { StudyAnalytics } from './study-analytics'
import { ProfileManager } from './profile-manager'
import { CalendarView } from './calendar/calendar-view'
import { useTasks } from '@/hooks/use-tasks'
import { useStudySessions } from '@/hooks/use-study-sessions'
import { useEvents } from '@/hooks/use-events'
import { ExamCountdown } from './exam-countdown'
import { StudyTracker } from './study-tracker'
import { Leaderboard } from './leaderboard'
import { RotatingQuote } from './rotating-quote'

export function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'tasks' | 'analytics' | 'leaderboard' | 'settings'>('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user } = useFirebase()
  const { tasks, updateTask, addTask } = useTasks()
  const { sessions: studySessions } = useStudySessions()
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()

  const tabs = [
    {
      id: 'home' as const,
      icon: Timer,
      label: 'Study Timer'
    },
    {
      id: 'calendar' as const,
      icon: Calendar,
      label: 'Calendar'
    },
    {
      id: 'tasks' as const,
      icon: ListTodo,
      label: 'Tasks'
    },
    {
      id: 'analytics' as const,
      icon: BarChart2,
      label: 'Analytics'
    },
    {
      id: 'leaderboard' as const,
      icon: Trophy,
      label: 'Leaderboard'
    },
    {
      id: 'settings' as const,
      icon: Settings,
      label: 'Settings'
    }
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div 
        className={cn(
          "h-screen sticky top-0 flex flex-col border-r transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h1 className={cn(
            "font-bold transition-all duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0 w-0"
          )}>
            JEE Prep
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start",
                !sidebarOpen && "justify-center"
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              <span className={cn(
                "transition-all duration-300",
                sidebarOpen ? "opacity-100" : "opacity-0 w-0"
              )}>
                {tab.label}
              </span>
            </Button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <Card className="h-full">
          {activeTab === 'home' && (
            <div className="space-y-4">
              {user && (
                <div className="grid grid-cols-1 md:grid-cols-[1fr,400px] gap-4 p-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      Hey, {user.displayName || 'Student'}! 👋
                    </h2>
                    <p className="text-muted-foreground">
                      Ready to ace your JEE preparation?
                    </p>
                  </div>
                  <RotatingQuote />
                </div>
              )}
              <ExamCountdown />
              <StudyTracker expanded={true} />
            </div>
          )}
          {activeTab === 'calendar' && (
            <CalendarView 
              studySessions={studySessions}
              tasks={tasks}
              events={events}
              onUpdateTask={updateTask}
              onAddTask={addTask}
              onAddEvent={addEvent}
              onUpdateEvent={updateEvent}
              onDeleteEvent={deleteEvent}
            />
          )}
          {activeTab === 'tasks' && <TodoList />}
          {activeTab === 'analytics' && <StudyAnalytics />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'settings' && <ProfileManager />}
        </Card>
      </div>
    </div>
  )
} 