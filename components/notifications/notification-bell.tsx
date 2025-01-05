"use client"

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useFirebase } from '@/components/firebase-provider'
import { getNotifications } from '@/lib/firebase/notifications'
import type { AppNotification } from '@/types/notification'
import { NotificationPopover } from './notification-popover'

export function NotificationBell() {
  const { user } = useFirebase()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  
  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (user) {
      getNotifications(user.uid).then(setNotifications)
    }
  }, [user])

  return (
    <NotificationPopover
      open={isOpen}
      onOpenChange={setIsOpen}
      notifications={notifications}
      setNotifications={setNotifications}
    >
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
            {unreadCount}
          </span>
        )}
      </Button>
    </NotificationPopover>
  )
} 