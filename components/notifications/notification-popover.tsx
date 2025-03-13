"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Check, Bell, Calendar, Brain, Trophy } from "lucide-react"
import { format } from "date-fns"
import type { AppNotification } from '@/types/notification'
import { markNotificationAsRead } from '@/lib/firebase/notifications'
import { cn } from "@/lib/utils"

interface NotificationPopoverProps {
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  notifications: AppNotification[]
  setNotifications: (notifications: AppNotification[]) => void
}

export function NotificationPopover({
  children,
  open,
  onOpenChange,
  notifications,
  setNotifications
}: NotificationPopoverProps) {
  const handleMarkAsRead = async (notification: AppNotification) => {
    if (notification.read) return
    
    await markNotificationAsRead(notification.id)
    setNotifications(
      notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    )
  }

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'task':
        return Check
      case 'event':
        return Calendar
      case 'study':
        return Brain
      case 'streak':
        return Trophy
      default:
        return Bell
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              notifications
                .filter(n => !n.read)
                .forEach(handleMarkAsRead)
            }}
          >
            Mark all as read
          </Button>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => {
                const Icon = getIcon(notification.type)
                
                return (
                  <button
                    key={notification.id}
                    className={cn(
                      "w-full text-left p-4 hover:bg-accent transition-colors",
                      !notification.read && "bg-accent/50"
                    )}
                    onClick={() => {
                      handleMarkAsRead(notification)
                      if (notification.actionUrl) {
                        window.open(notification.actionUrl, '_blank')
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 space-y-1">
                        <p className={cn(
                          "text-sm",
                          !notification.read && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
} 
