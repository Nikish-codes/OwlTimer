import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { Todo } from '@/types/todo'
import { CalendarEvent } from '@/types/event'

interface SyncData {
  todos: Todo[]
  events: CalendarEvent[]
}

export class SyncService {
  private userId: string
  private lastSyncTime: Date | null = null

  constructor(userId: string) {
    this.userId = userId
  }

  async syncToServer(localData: SyncData): Promise<void> {
    const todosRef = collection(db, 'todos')
    const eventsRef = collection(db, 'events')

    // Sync todos
    for (const todo of localData.todos) {
      if (!todo.synced) {
        await addDoc(todosRef, {
          ...todo,
          userId: this.userId,
          synced: true,
          lastModified: new Date()
        })
      }
    }

    // Sync events
    for (const event of localData.events) {
      if (!event.synced) {
        await addDoc(eventsRef, {
          ...event,
          userId: this.userId,
          synced: true,
          lastModified: new Date()
        })
      }
    }

    this.lastSyncTime = new Date()
  }

  async getServerData(): Promise<SyncData> {
    const todosQuery = query(
      collection(db, 'todos'),
      where('userId', '==', this.userId)
    )

    const eventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', this.userId)
    )

    const [todosSnapshot, eventsSnapshot] = await Promise.all([
      getDocs(todosQuery),
      getDocs(eventsQuery)
    ])

    return {
      todos: todosSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Todo)),
      events: eventsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CalendarEvent))
    }
  }

  async resolveConflicts(localData: SyncData, serverData: SyncData): Promise<SyncData> {
    // Simple last-write-wins strategy
    const mergedTodos = [...localData.todos, ...serverData.todos].reduce((acc, todo) => {
      const existing = acc.find(t => t.id === todo.id)
      if (existing && isValidDate(todo.lastModified?.toString()) && todo.lastModified && existing.lastModified && new Date(todo.lastModified) > new Date(existing.lastModified)) {
        return [...acc.filter(t => t.id !== todo.id), todo]
      }
      return acc
    }, [] as Todo[])

    const mergedEvents = [...localData.events, ...serverData.events].reduce((acc, event) => {
      const existing = acc.find(e => e.id === event.id)
      if (!existing || (event.lastModified && existing.lastModified && new Date(event.lastModified) > new Date(existing.lastModified))) {
        return [...acc.filter(e => e.id !== event.id), event]
      }
      return acc
    }, [] as CalendarEvent[])

    return {
      todos: mergedTodos,
      events: mergedEvents
    }
  }
}

function isValidDate(dateString: string | undefined | null): boolean {
  // Check if the input is a valid date string
  if (typeof dateString !== 'string') return false
  const date = new Date(dateString)
  return !isNaN(date.getTime())
} 