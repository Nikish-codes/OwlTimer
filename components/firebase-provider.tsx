"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, updateProfile, updatePassword, sendEmailVerification, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'


interface FirebaseContextProps {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (displayName: string) => Promise<void>
  updateUserPassword: (password: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  db: any
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined)

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: username })
      await sendEmailVerification(user)
      
      // Initialize user data in Firestore
      const userRef = doc(db, 'users', user.uid)
      await setDoc(userRef, {
        username: username,
        email: email,
        totalStudyTime: 0,
        studyTimes: {
          Physics: 0,
          Chemistry: 0,
          Mathematics: 0
        },
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      // Check if user data exists in Firestore, if not initialize it
      const userRef = doc(db, 'users', result.user.uid)
      const userDoc = await getDoc(userRef)
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          username: result.user.displayName || 'Anonymous',
          email: result.user.email,
          totalStudyTime: 0,
          studyTimes: {
            Physics: 0,
            Chemistry: 0,
            Mathematics: 0
          },
          createdAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error("Error resetting password:", error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await auth.signOut()
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const updateUserProfile = async (displayName: string) => {
    if (!user) throw new Error("User not logged in")
    try {
      await updateProfile(user, { displayName })
    } catch (error) {
      console.error("Error updating profile:", error)
      throw error
    }
  }

  const updateUserPassword = async (password: string) => {
    if (!user) throw new Error("User not logged in")
    try {
      await updatePassword(user, password)
    } catch (error) {
      console.error("Error updating password:", error)
      throw error
    }
  }

  const sendVerificationEmail = async () => {
    if (!user) throw new Error("User not logged in")
    try {
      await sendEmailVerification(user)
    } catch (error) {
      console.error("Error sending verification email:", error)
      throw error
    }
  }

  const value: FirebaseContextProps = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
    updateUserPassword,
    sendVerificationEmail,
    resetPassword,
    db,
  }

  return (
    <FirebaseContext.Provider value={value}>
      {!loading && children}
    </FirebaseContext.Provider>
  )
}

export function useFirebase() {
  const context = useContext(FirebaseContext)
  if (!context) {
    throw new Error("useFirebase must be used within a FirebaseProvider")
  }
  return context
}

