import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, Timestamp } from 'firebase/firestore'
import { Todo } from '@/types/todo'

export async function getTasks(userId: string) {
  const tasksRef = collection(db, 'todos')
  const q = query(
    tasksRef, 
    where('userId', '==', userId),
    orderBy('dueDate', 'asc')
  )
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dueDate: doc.data().dueDate?.toDate(),
    createdAt: doc.data().createdAt?.toDate()
  })) as Todo[]
}

export async function addTask(userId: string, task: Omit<Todo, 'id' | 'userId'>) {
  const tasksRef = collection(db, 'todos')
  const docRef = await addDoc(tasksRef, {
    ...task,
    userId,
    createdAt: Timestamp.now(),
    dueDate: task.dueDate ? Timestamp.fromDate(new Date(task.dueDate)) : null
  })
  return docRef.id
}

export async function updateTask(taskId: string, updates: Partial<Todo>) {
  const taskRef = doc(db, 'todos', taskId)
  const firestoreUpdates = {
    ...updates,
    dueDate: updates.dueDate ? Timestamp.fromDate(new Date(updates.dueDate)) : null
  }
  await updateDoc(taskRef, firestoreUpdates)
} 