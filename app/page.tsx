"use client"

import { useFirebase } from '@/components/firebase-provider'
import { AuthPage } from '@/components/auth-page'
import { MainApp } from '@/components/main-app'

export default function Home() {
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

