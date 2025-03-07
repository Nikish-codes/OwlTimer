"use client"

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, ListTodo, BarChart2, Settings, Menu, Timer, Trophy, Quote, Volume2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useFirebase } from '@/components/firebase-provider'
import { TodoList } from '@/components/todo-list'
import { StudyAnalytics } from '@/components/study-analytics'
import { ProfileManager } from '@/components/profile-manager'
import { CalendarView } from '@/components/calendar/calendar-view'
import { useTasks } from '@/hooks/use-tasks'
import { useStudySessions } from '@/hooks/use-study-sessions'
import { useEvents } from '@/hooks/use-events'
import { ExamCountdown } from '@/components/exam-countdown'
import { StudyTracker } from '@/components/study-tracker'
import { Leaderboard } from '@/components/leaderboard'
import { RotatingQuote } from '@/components/rotating-quote'
import { RelaxationSounds } from '@/components/relaxation-sounds'
import { ThoughtJournal } from '@/components/thought-journal'
import { AudioStateProvider } from '@/components/audio-state-provider'
import { useTimer } from '@/components/study-timer-provider'
import { useToast } from "@/components/ui/use-toast"

// Format time helper function
const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function MainAppContent() {
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'tasks' | 'analytics' | 'leaderboard' | 'settings'>('home')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user } = useFirebase()
  const { tasks, updateTask, addTask } = useTasks()
  const { sessions: studySessions } = useStudySessions()
  const { events, addEvent, updateEvent, deleteEvent } = useEvents()
  const { toast } = useToast()
  
  // Access timer context
  const { isRunning, stopTimer, startTimer, pauseTimer, currentTime } = useTimer()
  
  // Track previous tab to detect navigation away from timer
  const [prevTab, setPrevTab] = useState(activeTab)
  
  // Track if timer was running before navigation
  const [wasTimerRunning, setWasTimerRunning] = useState(false)

  // Move RelaxationSounds to root level to maintain audio state across navigation
  const [showSoundControls, setShowSoundControls] = useState(false)

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

  // Handle tab changes and timer notifications
  useEffect(() => {
    if (prevTab === 'home' && activeTab !== 'home' && isRunning) {
      // Notify the user that timer is still running in background
      toast({
        title: "Timer Still Running",
        description: "Your timer is still running in the background!",
        duration: 5000
      });
      // Store that timer was running when navigating away
      setWasTimerRunning(true);
      // We don't pause the timer anymore, it continues running
    }
    
    if (activeTab === 'home' && prevTab !== 'home') {
      if (isRunning) {
        // Just notify the user that they're back to the timer page
        toast({
          title: "Timer Active",
          description: "Welcome back to your study timer!",
          duration: 3000
        });
      } else if (wasTimerRunning) {
        // Timer was running when they left but isn't now - might have been reset
        toast({
          title: "Timer Status",
          description: "Your timer state has been restored.",
          duration: 3000
        });
        // Reset the flag after handling it
        setWasTimerRunning(false);
      }
      
      // Important: Do NOT call any timer reset functions here
      // as it would reset the timer when navigating back to the timer page
    }
    
    setPrevTab(activeTab);
  }, [activeTab, isRunning, prevTab, toast, wasTimerRunning]);
  
  // Add floating timer controls when timer is running and not on home page
  useEffect(() => {
    // We're no longer showing the floating timer controls
    // Just track if timer was running for notification purposes
    setWasTimerRunning(isRunning && activeTab !== 'home');
  }, [isRunning, activeTab]);

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Floating Timer Controls - Removed as requested */}

      {/* Floating RelaxationSounds controls */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSoundControls(!showSoundControls)}
          className="mb-2"
        >
          <Volume2 className="h-4 w-4" />
        </Button>
        {showSoundControls && (
          <Card className="p-4 w-[300px]">
            <RelaxationSounds />
          </Card>
        )}
      </div>
      
      
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
        
        {/* Always visible timer in sidebar when running */}
        {isRunning && (
          <div className={cn(
            "mt-4 p-3 rounded-md bg-primary/10 border border-primary/20 text-center transition-all duration-300",
            sidebarOpen ? "mx-2" : "mx-1"
          )}>
            <div className="text-xs text-muted-foreground mb-1">
              {sidebarOpen ? "Timer Running" : "⏱️"}
            </div>
            <div className={cn(
              "font-mono font-bold",
              sidebarOpen ? "text-sm" : "text-xs"
            )}>
              {formatTime(currentTime)}
            </div>
          </div>
        )}
      </nav>
    </div>

    {/* Main Content */}
    <div className="flex-1 p-4">
      <Card className="h-full">
        {activeTab === 'home' && (
          <div className="space-y-6 p-4">
            {user && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr,400px] gap-4 mb-6">
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
            <div className="space-y-12">
              <StudyTracker expanded={false} />
              <div className="space-y-6">
                <div className="bg-card rounded-lg p-6 border">
                  <RelaxationSounds />
                </div>
                <div className="bg-card rounded-lg p-6 border">
                  <ThoughtJournal />
                </div>
              </div>
            </div>
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
        {activeTab === 'leaderboard' && <Leaderboard expanded={true} />}
        {activeTab === 'settings' && <ProfileManager />}
      </Card>
    </div>
  </div>
  )
}

export function MainApp() {
  return (
    <AudioStateProvider>
      <MainAppContent />
    </AudioStateProvider>
  )
}