import { db } from '@/lib/firebase/config'
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'

export interface Todo {
  id: string
  userId: string
  text: string
  priority: 'low' | 'medium' | 'high'
  subject: string
  dueDate: string | null
  completed: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
  subtasks: { id: string; text: string; completed: boolean }[]
  synced?: boolean
}

export interface Subtask {
  id: number
  text: string
  completed: boolean
}

const todosCollection = collection(db, 'todos')

export async function getTodos(userId: string): Promise<Todo[]> {
  const q = query(
    todosCollection, 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
      completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate().toISOString() : data.completedAt,
      dueDate: data.dueDate instanceof Timestamp ? data.dueDate.toDate().toISOString() : data.dueDate
    } as Todo
  })
}

export async function addTodo(todo: Omit<Todo, 'id'>): Promise<string> {
  const docRef = await addDoc(todosCollection, {
    ...todo,
    createdAt: serverTimestamp(),
    completedAt: todo.completedAt ? Timestamp.fromDate(new Date(todo.completedAt)) : null,
    dueDate: todo.dueDate ? Timestamp.fromDate(new Date(todo.dueDate)) : null
  })
  return docRef.id
}

export async function updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
  const todoDoc = doc(db, 'todos', id)
  const updatedFields: any = { ...updates }
  
  // Convert date strings to Firestore Timestamps
  if ('completedAt' in updates) {
    updatedFields.completedAt = updates.completedAt ? Timestamp.fromDate(new Date(updates.completedAt)) : null
  }
  if ('dueDate' in updates) {
    updatedFields.dueDate = updates.dueDate ? Timestamp.fromDate(new Date(updates.dueDate)) : null
  }
  
  await updateDoc(todoDoc, updatedFields)
}

export async function deleteTodo(id: string): Promise<void> {
  const todoDoc = doc(db, 'todos', id)
  await deleteDoc(todoDoc)
}
