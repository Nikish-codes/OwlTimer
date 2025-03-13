"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card"
import { TaskForm } from "@/components/task-form"
import { TaskFilters } from "@/components/task-filters"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Plus, 
  Search,
  SortAsc,
  SortDesc,
  X
} from "lucide-react"
import { TaskItem } from "@/components/todo/task-item"
import type { TaskFilters as TaskFiltersType } from "@/lib/task-filters"
import { filterTasks } from "@/lib/task-filters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useFirebaseTasks } from "@/hooks/use-firebase-tasks"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import { Todo } from "@/lib/firebase/todos"
import { format, isToday, isPast, parseISO } from "date-fns"

type SortOption = "dueDate" | "priority" | "title"
type SortDirection = "asc" | "desc"

export function TodoList() {
  const { user, loading: authLoading } = useAuth()
  const {
    loading,
    error,
    overdueTasks,
    todaysTasks,
    upcomingTasks,
    addTask,
    updateTask,
    deleteTask
  } = useFirebaseTasks()

  const [filters, setFilters] = useState<TaskFiltersType>({
    search: '',
    priorities: [],
    subjects: [],
    showCompleted: false
  })

  const [showAddTask, setShowAddTask] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("dueDate")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [activeTab, setActiveTab] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [showMissedTasks, setShowMissedTasks] = useState(true)

  // Enhanced updateTask with retry and fallback
  const handleUpdateTask = async (taskId: string, updates: Partial<Todo>) => {
    try {
      // First attempt to update in Firebase
      await updateTask(taskId, updates);
      console.log("Task updated successfully:", taskId, updates);
    } catch (error) {
      console.error("Error updating task in Firebase:", error);
      
      // Show error toast
      toast({
        title: "Error updating task",
        description: "Task will be saved locally and synced later",
        variant: "destructive"
      });
      
      // Store the update in localStorage for later sync
      const pendingUpdates = JSON.parse(localStorage.getItem('pendingTaskUpdates') || '[]');
      pendingUpdates.push({
        taskId,
        updates,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingTaskUpdates', JSON.stringify(pendingUpdates));
      
      // Update the local state to reflect the change
      // This ensures the UI shows the correct state even if Firebase update failed
      const allTasks = [...overdueTasks, ...todaysTasks, ...upcomingTasks];
      const taskToUpdate = allTasks.find(task => task.id === taskId);
      
      if (taskToUpdate) {
        const updatedTask = { ...taskToUpdate, ...updates };
        
        // Create new arrays with the updated task
        const updatedOverdueTasks = overdueTasks.map(task => 
          task.id === taskId ? updatedTask : task
        );
        const updatedTodaysTasks = todaysTasks.map(task => 
          task.id === taskId ? updatedTask : task
        );
        const updatedUpcomingTasks = upcomingTasks.map(task => 
          task.id === taskId ? updatedTask : task
        );
        
        // Save the updated tasks to local storage
        const localStorageKey = `tasks_${user?.id}`;
        const allUpdatedTasks = [...updatedOverdueTasks, ...updatedTodaysTasks, ...updatedUpcomingTasks];
        localStorage.setItem(localStorageKey, JSON.stringify(allUpdatedTasks));
        
        // Force a re-render with the updated task arrays
        if (updates.completed !== undefined) {
          // If this was a completion toggle, update all task arrays
          // We need to update the actual state variables to trigger a re-render
          // This is a workaround since we can't directly modify the state from useFirebaseTasks
          setFilters(prev => ({ ...prev })); // Trigger re-render
        }
      }
    }
  };

  // Function to sync pending updates
  const syncPendingUpdates = async () => {
    const pendingUpdates = JSON.parse(localStorage.getItem('pendingTaskUpdates') || '[]');
    if (pendingUpdates.length === 0) return;
    
    let successCount = 0;
    const remainingUpdates = [];
    
    for (const update of pendingUpdates) {
      try {
        await updateTask(update.taskId, update.updates);
        successCount++;
      } catch (error) {
        console.error("Failed to sync task update:", error);
        remainingUpdates.push(update);
      }
    }
    
    if (successCount > 0) {
      toast({
        title: "Tasks synced",
        description: `${successCount} task updates have been synced to the cloud`,
        variant: "default"
      });
    }
    
    localStorage.setItem('pendingTaskUpdates', JSON.stringify(remainingUpdates));
  };

  // Try to sync pending updates when component mounts
  useEffect(() => {
    if (user) {
      syncPendingUpdates();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <Card className="w-full h-64 flex items-center justify-center shadow-sm border-border/40">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className="w-full h-64 flex items-center justify-center shadow-sm border-border/40">
        <div className="flex flex-col items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Please sign in to manage your tasks</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const filteredOverdueTasks = filterTasks(overdueTasks, filters)
  const filteredTodaysTasks = filterTasks(todaysTasks, filters)
  const filteredUpcomingTasks = filterTasks(upcomingTasks, filters)
  
  const allTasks = [...todaysTasks, ...upcomingTasks]
  
  const sortTasks = (tasks: typeof overdueTasks) => {
    return [...tasks].sort((a, b) => {
      if (sortBy === "dueDate") {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA
      } else if (sortBy === "priority") {
        const priorityMap = { high: 3, medium: 2, low: 1 }
        const priorityA = priorityMap[a.priority as keyof typeof priorityMap] || 0
        const priorityB = priorityMap[b.priority as keyof typeof priorityMap] || 0
        return sortDirection === "asc" ? priorityA - priorityB : priorityB - priorityA
      } else {
        const textA = a.text || ""
        const textB = b.text || ""
        return sortDirection === "asc" 
          ? textA.localeCompare(textB)
          : textB.localeCompare(textA)
      }
    })
  }

  const sortedOverdueTasks = sortTasks(overdueTasks)
  const sortedTodaysTasks = sortTasks(todaysTasks)
  const sortedUpcomingTasks = sortTasks(upcomingTasks)

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === "asc" ? "desc" : "asc")
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }

  const clearSearch = () => {
    setFilters(prev => ({ ...prev, search: '' }))
  }

  const hasActiveFilters = filters.priorities.length > 0 || filters.subjects.length > 0

  return (
    <Card className="shadow-sm border-border/40">
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-semibold">Tasks</CardTitle>
            <CardDescription>
              Manage your tasks and stay organized
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowAddTask(!showAddTask)} 
            size="sm" 
            variant={showAddTask ? "outline" : "default"}
            className="gap-1 h-8"
          >
            {showAddTask ? (
              <>
                <X className="h-3.5 w-3.5" /> Cancel
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Add Task
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {showAddTask && (
          <div className="bg-muted/20 p-3 rounded-md mb-4 border border-border/40">
            <TaskForm onSubmit={async (task) => {
              try {
                await addTask(task)
                setShowAddTask(false)
              } catch (err) {
                console.error('Error adding task:', err)
              }
            }} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-8 pr-8 h-9"
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {filters.search && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1 h-7 w-7" 
                onClick={clearSearch}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={hasActiveFilters ? "default" : "outline"} 
                  size="sm" 
                  className="gap-1 h-9"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1">
                      {filters.priorities.length + filters.subjects.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <TaskFilters
                    tasks={[...overdueTasks, ...todaysTasks, ...upcomingTasks]}
                    filters={filters}
                    onFiltersChange={setFilters}
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-9">
                  {sortDirection === "asc" ? 
                    <SortAsc className="h-3.5 w-3.5" /> : 
                    <SortDesc className="h-3.5 w-3.5" />
                  }
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setSortBy("dueDate")}
                  className={sortBy === "dueDate" ? "bg-muted" : ""}
                >
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  Due Date
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy("priority")}
                  className={sortBy === "priority" ? "bg-muted" : ""}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                  Priority
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy("title")}
                  className={sortBy === "title" ? "bg-muted" : ""}
                >
                  <Search className="h-3.5 w-3.5 mr-2" />
                  Title
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={toggleSortDirection}>
                  {sortDirection === "asc" ? 
                    <SortAsc className="h-3.5 w-3.5 mr-2" /> : 
                    <SortDesc className="h-3.5 w-3.5 mr-2" />
                  }
                  {sortDirection === "asc" ? "Ascending" : "Descending"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 h-9">
            <TabsTrigger value="all" className="text-xs">
              All
              <Badge variant="secondary" className="ml-1 h-5 px-1">
                {allTasks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="today" className="text-xs">
              <Clock className="h-3.5 w-3.5 mr-1 hidden sm:block" />
              Today
              <Badge variant="secondary" className="ml-1 h-5 px-1">
                {filteredTodaysTasks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs">
              <Calendar className="h-3.5 w-3.5 mr-1 hidden sm:block" />
              Upcoming
              <Badge variant="secondary" className="ml-1 h-5 px-1">
                {filteredUpcomingTasks.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4 mt-0">
            {sortedOverdueTasks.length > 0 && showMissedTasks && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm flex items-center gap-2 text-rose-600">
                    <AlertTriangle className="h-4 w-4" />
                    Overdue Tasks
                    <Badge variant="destructive" className="rounded-full">
                      {sortedOverdueTasks.length}
                    </Badge>
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => setShowMissedTasks(false)}
                  >
                    Hide
                  </Button>
                </div>
                <div className="p-3 border border-rose-200 rounded-md bg-rose-50 dark:bg-rose-950/10 dark:border-rose-800/30 space-y-2">
                  <p className="text-sm text-rose-600 mb-2">
                    These tasks have passed their due date and need your attention.
                  </p>
                  {sortedOverdueTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onUpdate={handleUpdateTask}
                      onDelete={deleteTask}
                    />
                  ))}
                </div>
              </div>
            )}

            {!showMissedTasks && sortedOverdueTasks.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mb-4 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1"
                onClick={() => setShowMissedTasks(true)}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Show {sortedOverdueTasks.length} Overdue Task{sortedOverdueTasks.length !== 1 ? 's' : ''}
              </Button>
            )}

            {allTasks.length > 0 ? (
              <>
                {sortedTodaysTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                      <Clock className="h-3.5 w-3.5" />
                      Today
                    </h3>
                    <div className="space-y-2">
                      {sortedTodaysTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onUpdate={handleUpdateTask}
                          onDelete={deleteTask}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {sortedUpcomingTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-xs flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                      <Calendar className="h-3.5 w-3.5" />
                      Upcoming
                    </h3>
                    <div className="space-y-2">
                      {sortedUpcomingTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onUpdate={handleUpdateTask}
                          onDelete={deleteTask}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-muted/30 p-4 rounded-full mb-3">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">All caught up!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You don't have any active tasks. Click the "Add Task" button to create a new task.
                </p>
                <Button 
                  onClick={() => setShowAddTask(true)} 
                  className="mt-4 gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Task
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="today" className="space-y-2 mt-0">
            {sortedTodaysTasks.length > 0 ? (
              sortedTodaysTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={handleUpdateTask}
                  onDelete={deleteTask}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-muted/30 p-4 rounded-full mb-3">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No tasks for today</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You don't have any tasks scheduled for today.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="upcoming" className="space-y-2 mt-0">
            {sortedUpcomingTasks.length > 0 ? (
              sortedUpcomingTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={handleUpdateTask}
                  onDelete={deleteTask}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-muted/30 p-4 rounded-full mb-3">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No upcoming tasks</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  You don't have any upcoming tasks scheduled.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

