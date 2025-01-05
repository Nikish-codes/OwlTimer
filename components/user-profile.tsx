"use client"

import { useFirebase } from './firebase-provider'
import { Button } from './ui/button'
import { getAuth, signOut } from 'firebase/auth'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { ProfileManager } from './profile-manager'
import { Settings } from 'lucide-react'

interface UserProfileProps {
  expanded?: boolean;
}

export function UserProfile({ expanded = false }: UserProfileProps) {
  const { user } = useFirebase()
  
  const handleSignOut = async () => {
    const auth = getAuth()
    await signOut(auth)
  }

  if (!user) return null

  // Get username from custom claims or fallback to email
  const displayName = user.displayName || user.email?.split('@')[0] || 'User'

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium">
        Welcome, {displayName}!
      </span>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <ProfileManager />
        </DialogContent>
      </Dialog>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  )
} 