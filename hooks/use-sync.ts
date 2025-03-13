import { useState, useEffect } from 'react'
import { SyncService } from '@/lib/sync-service'
import { useFirebase } from '@/components/firebase-provider'
import { useOfflineStorage } from './use-offline-storage'
import { toast } from '@/components/ui/use-toast'

export function useSync() {
  const { user } = useFirebase()
  const { offlineData, updateOfflineData } = useOfflineStorage()
  const [syncing, setSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      syncData()
    }
  }, [user])

  const syncData = async () => {
    if (!user || syncing) return

    setSyncing(true)
    try {
      const syncService = new SyncService(user.uid)
      
      // Get server data
      const serverData = await syncService.getServerData()
      
      // Resolve conflicts
      const mergedData = await syncService.resolveConflicts(offlineData, serverData)
      
      // Update local storage
      updateOfflineData(mergedData)
      
      // Sync local changes to server
      await syncService.syncToServer(offlineData)
      
      setLastSyncTime(new Date())
      toast({
        title: "Sync completed",
        description: "Your data is up to date"
      })
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: "Sync failed",
        description: "Please check your connection and try again",
        variant: "destructive"
      })
    } finally {
      setSyncing(false)
    }
  }

  return {
    syncing,
    lastSyncTime,
    syncData
  }
} 
