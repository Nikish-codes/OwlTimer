"use client"

import { useFirebase } from '@/components/firebase-provider'
import dynamic from 'next/dynamic'

const AuthPage = dynamic(() => import('@/components/auth-page').then(mod => mod.AuthPage), {
  ssr: false
})

const MainApp = dynamic(() => import('@/components/main-app').then(mod => mod.MainApp), {
  ssr: false
})

const FirebaseProvider = dynamic(
  () => import('@/components/firebase-provider').then(mod => ({ default: mod.FirebaseProvider })),
  { ssr: false }
)

export default function Home() {
  return (
    <FirebaseProvider>
      <HomeContent />
    </FirebaseProvider>
  )
}

function HomeContent() {
  const { user, loading } = useFirebase()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      Loading...
    </div>
  }

  if (!user) {
    return <AuthPage />
  }

  return <MainApp />
}

