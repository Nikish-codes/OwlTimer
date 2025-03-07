import { db } from '@/lib/firebase/config'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { Todo } from '@/types/todo'

const todosCollection = collection(db, 'todos')

export async function getTodos(userId: string): Promise<Todo[]> {
  const q = query(todosCollection, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Todo))
}

export async function addTodo(todo: Omit<Todo, 'id'>): Promise<string> {
  const docRef = await addDoc(todosCollection, todo)
  return docRef.id
}

export async function updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
  const todoDoc = doc(db, 'todos', id)
  await updateDoc(todoDoc, updates)
}

export async function deleteTodo(id: string): Promise<void> {
  const todoDoc = doc(db, 'todos', id)
  await deleteDoc(todoDoc)
} 