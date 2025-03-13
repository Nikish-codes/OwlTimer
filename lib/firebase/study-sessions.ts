import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore'
import { StudySession } from '@/types/study-session'

export async function addStudySession(userId: string, session: Omit<StudySession, 'id' | 'userId'>) {
  const sessionsRef = collection(db, 'studySessions')
  const now = new Date()
  const docRef = await addDoc(sessionsRef, {
    ...session,
    userId,
    timestamp: now.toISOString(),
    date: now.toISOString(),
    createdAt: now.toISOString()
  })
  return docRef.id
}

export async function getStudySessions(userId: string) {
  const sessionsRef = collection(db, 'studySessions')
  const q = query(
    sessionsRef, 
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  )
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as StudySession[]
}

export async function updateStudySession(sessionId: string, updates: Partial<StudySession>) {
  const sessionRef = doc(db, 'studySessions', sessionId)
  await updateDoc(sessionRef, updates)
} 
