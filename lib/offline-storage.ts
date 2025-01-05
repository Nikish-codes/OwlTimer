import { Todo } from '@/types/todo'

export async function updateOfflineTodo(todo: Todo) {
  try {
    const todos = await getOfflineTodos()
    const updatedTodos = todos.map(t => t.id === todo.id ? todo : t)
    localStorage.setItem('offline_todos', JSON.stringify(updatedTodos))
    return true
  } catch (error) {
    console.error('Error updating offline todo:', error)
    return false
  }
}

export async function getOfflineTodos(): Promise<Todo[]> {
  try {
    const todos = localStorage.getItem('offline_todos')
    return todos ? JSON.parse(todos) : []
  } catch {
    return []
  }
}

export async function addOfflineTodo(todo: Todo) {
  try {
    const todos = await getOfflineTodos()
    todos.push(todo)
    await localStorage.setItem('offline_todos', JSON.stringify(todos))
    return true
  } catch (error) {
    console.error('Error adding offline todo:', error)
    return false
  }
} 