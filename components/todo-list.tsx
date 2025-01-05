"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TaskForm } from "./task-form"
import { TaskFilters } from "./task-filters"
import { useTasks } from "@/hooks/use-tasks"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { TaskItem } from "./todo/task-item"
import { useState } from "react"
import type { TaskFilters as TaskFiltersType } from "@/lib/task-filters"
import { filterTasks } from "@/lib/task-filters"

export function TodoList() {
  const {
    loading,
    overdueTasks,
    todaysTasks,
    upcomingTasks,
    completedTasks,
    addTask,
    updateTask,
    deleteTask
  } = useTasks()

  const [filters, setFilters] = useState<TaskFiltersType>({
    search: '',
    priorities: [],
    subjects: [],
    showCompleted: false
  })

  if (loading) {
    return <div>Loading...</div>
  }

  const filteredOverdueTasks = filterTasks(overdueTasks, filters)
  const filteredTodaysTasks = filterTasks(todaysTasks, filters)
  const filteredUpcomingTasks = filterTasks(upcomingTasks, filters)
  const filteredCompletedTasks = filterTasks(completedTasks, filters)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <TaskForm onSubmit={addTask} />

        <TaskFilters
          tasks={[...overdueTasks, ...todaysTasks, ...upcomingTasks, ...completedTasks]}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {filteredOverdueTasks.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Overdue Tasks</AlertTitle>
            <AlertDescription>
              You have {filteredOverdueTasks.length} overdue tasks
            </AlertDescription>
            <div className="mt-2 space-y-2">
              {filteredOverdueTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          </Alert>
        )}

        {/* Today's Tasks */}
        <div className="space-y-2">
          <h3 className="font-medium">Today</h3>
          {filteredTodaysTasks.length > 0 ? (
            filteredTodaysTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No tasks for today.</p>
          )}
        </div>

        {/* Upcoming Tasks */}
        <div className="space-y-2">
          <h3 className="font-medium">Upcoming</h3>
          {filteredUpcomingTasks.length > 0 ? (
            filteredUpcomingTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
          )}
        </div>

        {/* Completed Tasks */}
        {filters.showCompleted && (
          <div className="space-y-2 mt-4">
            <h3 className="font-medium">Completed</h3>
            {filteredCompletedTasks.length > 0 ? (
              filteredCompletedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No completed tasks.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

