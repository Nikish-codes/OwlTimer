"use client"

import { useFirebase } from './firebase-provider'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { SettingsDialog } from './settings-dialog'
import { Settings } from 'lucide-react'

interface UserProfileProps {
  expanded?: boolean;
}

export function UserProfile({ expanded = false }: UserProfileProps) {
  const { user } = useFirebase()

  if (!user) return null

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
        <DialogContent className="sm:max-w-[425px]">
          <SettingsDialog />
        </DialogContent>
      </Dialog>
    </div>
  )
}
