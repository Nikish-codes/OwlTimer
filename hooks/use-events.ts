import { useState, useEffect } from 'react'
import { CalendarEvent } from '@/types/event'
import { useFirebase } from '@/components/firebase-provider'
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { user, db } = useFirebase()

  const refreshEvents = async () => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    const eventsRef = collection(db, 'events')
    const q = query(eventsRef, where('userId', '==', user.uid))

    return new Promise<void>((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newEvents = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CalendarEvent[]
        
        console.log('Fetched events from Firebase:', newEvents)
        setEvents(newEvents)
        setLoading(false)
        resolve()
      }, (error) => {
        console.error('Error fetching events:', error)
        setLoading(false)
        resolve()
      })
    })
  }

  useEffect(() => {
    refreshEvents()
  }, [user, db])

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    if (!user) throw new Error('User must be logged in')
    
    try {
      console.log('Adding event to Firebase:', event)
      const eventsRef = collection(db, 'events')
      
      // Remove undefined fields
      const eventData = Object.fromEntries(
        Object.entries({
          ...event,
          createdAt: new Date().toISOString(),
          userId: user.uid,
          synced: true
        }).filter(([_, value]) => value !== undefined)
      )
      
      console.log('Cleaned event data:', eventData)
      await addDoc(eventsRef, eventData)
      
      console.log('Successfully added event')
      
    } catch (error) {
      console.error('Error adding event:', error)
      throw error
    }
  }

  const updateEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    if (!user) throw new Error('User must be logged in')
    await updateDoc(doc(db, 'events', eventId), updates)
  }

  const deleteEvent = async (eventId: string) => {
    if (!user) throw new Error('User must be logged in')
    await deleteDoc(doc(db, 'events', eventId))
  }

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents
  }
} 
