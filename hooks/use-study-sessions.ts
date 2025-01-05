import { useState, useEffect } from 'react'
import { StudySession } from '@/types/study-session'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useFirebase } from '@/components/firebase-provider'

export function useStudySessions() {
  const { user, db } = useFirebase()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user])

  const loadSessions = async () => {
    if (!user) return
    setLoading(true)
    try {
      const sessionsRef = collection(db, 'studySessions')
      const q = query(
        sessionsRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc')
      )
      const snapshot = await getDocs(q)
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudySession)))
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
    setLoading(false)
  }

  return { sessions, loading, refresh: loadSessions }
} 