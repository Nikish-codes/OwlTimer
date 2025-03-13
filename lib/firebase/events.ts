import { db } from '@/lib/firebase/config'
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore'
import { CalendarEvent } from '@/types/event'

const eventsCollection = collection(db, 'events')

export async function getEvents(userId: string): Promise<CalendarEvent[]> {
  const q = query(eventsCollection, where('userId', '==', userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent))
}

export async function addEvent(event: Omit<CalendarEvent, 'id'>): Promise<string> {
  const docRef = await addDoc(eventsCollection, event)
  return docRef.id
}

export async function updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<void> {
  const eventDoc = doc(db, 'events', id)
  await updateDoc(eventDoc, updates)
}

export async function deleteEvent(id: string): Promise<void> {
  const eventDoc = doc(db, 'events', id)
  await deleteDoc(eventDoc)
} 
