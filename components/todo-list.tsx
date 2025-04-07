"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DayPicker } from "react-day-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown, ChevronRight, Plus, X } from "lucide-react"
import { useFirebase } from "./firebase-provider"
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, updateDoc } from "firebase/firestore"
import { Checkbox } from "@/components/ui/checkbox"

interface SubTask {
  id?: string
  title: string
  completed: boolean
}

interface Todo {
  id?: string
  title: string
  date: Date
  completed: boolean
  subtasks: SubTask[]
}

export function TodoList() {
  const { db, user } = useFirebase()
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null)
  const [newSubtask, setNewSubtask] = useState<string>("")

  useEffect(() => {
    if (user) {
      loadTodos()
    }
  }, [user])

  const loadTodos = async () => {
    if (!user) return
    const q = query(collection(db, 'todos'), where('userId', '==', user.uid))
    const querySnapshot = await getDocs(q)
    const loadedTodos: Todo[] = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      loadedTodos.push({
        id: doc.id,
        title: data.title,
        date: data.date?.toDate() || new Date(),
        completed: data.completed || false,
        subtasks: data.subtasks || []
      })
    })
    setTodos(loadedTodos)
  }

  const addTodo = async () => {
    if (!newTodo.trim() || !user) return
    const todo: Todo = {
      title: newTodo,
      date: selectedDate,
      completed: false,
      subtasks: []
    }
    try {
      await addDoc(collection(db, 'todos'), {
        ...todo,
        userId: user.uid,
        date: selectedDate,
        createdAt: new Date()
      })
      await loadTodos()
      setNewTodo("")
    } catch (error) {
      console.error('Error adding todo:', error)
    }
  }

  const toggleTodo = async (todoId: string, completed: boolean) => {
    if (!user) return
    try {
      await updateDoc(doc(db, 'todos', todoId), { completed })
      await loadTodos()
    } catch (error) {
      console.error('Error updating todo:', error)
    }
  }

  const deleteTodo = async (todoId: string) => {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'todos', todoId))
      await loadTodos()
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  const addSubtask = async (todoId: string) => {
    if (!newSubtask.trim() || !user) return
    try {
      const todoRef = doc(db, 'todos', todoId)
      const todo = todos.find(t => t.id === todoId)
      if (!todo) return

      const newSubtaskObj: SubTask = {
        title: newSubtask,
        completed: false
      }

      await updateDoc(todoRef, {
        subtasks: [...todo.subtasks, newSubtaskObj]
      })

      await loadTodos()
      setNewSubtask("")
    } catch (error) {
      console.error('Error adding subtask:', error)
    }
  }

  const toggleSubtask = async (todoId: string, subtaskIndex: number, completed: boolean) => {
    if (!user) return
    try {
      const todoRef = doc(db, 'todos', todoId)
      const todo = todos.find(t => t.id === todoId)
      if (!todo) return

      const updatedSubtasks = [...todo.subtasks]
      updatedSubtasks[subtaskIndex] = {
        ...updatedSubtasks[subtaskIndex],
        completed
      }

      await updateDoc(todoRef, { subtasks: updatedSubtasks })
      await loadTodos()
    } catch (error) {
      console.error('Error updating subtask:', error)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input
            placeholder="Add a new task..."
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[140px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                required={false}
                className="rounded-md border"
                footer={false}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={addTodo}>Add</Button>
        </div>

        <div className="space-y-4">
          {todos
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((todo) => (
              <div key={todo.id} className="space-y-2">
                <div className="flex items-start gap-2 group">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={(checked) => todo.id && toggleTodo(todo.id, checked as boolean)}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          todo.completed && "line-through text-muted-foreground"
                        )}>
                          {todo.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(todo.date, "MMM d")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setExpandedTodo(todo.id ? (expandedTodo === todo.id ? null : todo.id) : null)}
                        >
                          {expandedTodo === todo.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => todo.id && deleteTodo(todo.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {expandedTodo === todo.id && (
                      <div className="pl-6 space-y-2 mt-2">
                        {todo.subtasks.map((subtask, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Checkbox
                              checked={subtask.completed}
                              onCheckedChange={(checked) => todo.id && toggleSubtask(todo.id, index, checked as boolean)}
                            />
                            <span className={cn(
                              "text-sm",
                              subtask.completed && "line-through text-muted-foreground"
                            )}>
                              {subtask.title}
                            </span>
        </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a subtask..."
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && todo.id && addSubtask(todo.id)}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => todo.id && addSubtask(todo.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
            )}
          </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}

