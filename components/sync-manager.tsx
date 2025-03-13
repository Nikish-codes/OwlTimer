"use client"

import { useEffect } from 'react'
import { useSync } from '@/hooks/use-sync'
import { useOnline } from '@/hooks/use-online'

export function SyncManager() {
  const { syncing, syncData } = useSync()
  const isOnline = useOnline()

  // Sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncData()
    }
  }, [isOnline])

  // Periodic sync every 5 minutes when online
  useEffect(() => {
    if (!isOnline) return

    const interval = setInterval(() => {
      syncData()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [isOnline])

  return null
} 
