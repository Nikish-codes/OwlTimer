import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore'
import { AppNotification } from '@/types/notification'

export async function addNotification(userId: string, notification: Omit<AppNotification, 'id' | 'userId'>) {
  const notificationsRef = collection(db, 'notifications')
  const docRef = await addDoc(notificationsRef, {
    ...notification,
    userId,
    timestamp: new Date(),
    read: false
  })
  return docRef.id
}

export async function getNotifications(userId: string) {
  const notificationsRef = collection(db, 'notifications')
  const q = query(
    notificationsRef, 
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  )
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AppNotification[]
}

export async function markNotificationAsRead(notificationId: string) {
  const notificationRef = doc(db, 'notifications', notificationId)
  await updateDoc(notificationRef, { read: true })
} 
