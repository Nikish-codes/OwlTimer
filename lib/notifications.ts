import type { AppNotification } from '@/types/notification'

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.error("This browser does not support notifications")
    return false
  }

  const permission = await window.Notification.requestPermission()
  return permission === "granted"
}

export function showNotification(notification: Omit<AppNotification, 'id' | 'userId'>) {
  if (!("Notification" in window)) return
  
  if (window.Notification.permission === "granted") {
    const notif = new window.Notification(notification.title, {
      body: notification.message,
      icon: '/app-icon.png',
      badge: '/badge-icon.png',
      tag: notification.type,
      data: {
        actionUrl: notification.actionUrl,
        relatedId: notification.relatedId
      }
    })

    notif.onclick = function(event) {
      event.preventDefault()
      if (notification.actionUrl) {
        window.open(notification.actionUrl, '_blank')
      }
      notif.close()
    }
  }
}

export function scheduleNotification(
  notification: Omit<AppNotification, 'id' | 'userId'>,
  scheduledTime: Date
) {
  const now = new Date().getTime()
  const notificationTime = scheduledTime.getTime()
  const delay = notificationTime - now

  if (delay > 0) {
    setTimeout(() => {
      showNotification(notification)
    }, delay)
  }
}
