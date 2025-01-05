"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from './firebase-provider'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { Medal } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface LeaderboardProps {
  expanded?: boolean
}

interface LeaderboardEntry {
  id: string
  username: string
  totalStudyTime: number
}

export function Leaderboard({ expanded = false }: LeaderboardProps) {
  const { db, user } = useFirebase()
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    if (user) {
      loadLeaderboard()
    }
  }, [user])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      console.log('Loading leaderboard...')
      
      const usersRef = collection(db, 'users')
      const q = query(
        usersRef,
        orderBy('totalStudyTime', 'desc'),
        limit(10)
      )
      console.log('Executing query...')
      
      const snapshot = await getDocs(q)
      console.log('Got snapshot:', snapshot.size, 'documents')
      
      const entries = snapshot.docs.map(doc => {
        const data = doc.data()
        console.log('User data:', data)
        return {
          id: doc.id,
          username: data.username || 'Anonymous',
          totalStudyTime: data.totalStudyTime || 0
        }
      })
      console.log('Processed entries:', entries)
      
      setLeaderboard(entries)
    } catch (error) {
      console.error('Error loading leaderboard:', error)
      setLeaderboard([])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Sign in to compete with others!
          </p>
          <Button variant="outline" asChild>
            <a href="/auth">Sign In</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center text-muted-foreground">No data yet</div>
        ) : (
          <ul className="space-y-2">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.id === user.uid
              return (
                <li 
                  key={entry.id} 
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg",
                    isCurrentUser ? "bg-muted" : "hover:bg-muted/50",
                    "transition-colors"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {index < 3 && (
                      <Medal className={cn(
                        index === 0 ? "text-yellow-500" :
                        index === 1 ? "text-gray-400" :
                        "text-amber-600"
                      )} />
                    )}
                    <span className={cn(
                      "font-medium",
                      isCurrentUser && "text-primary"
                    )}>
                      {index + 1}. {entry.username}
                      {isCurrentUser && " (You)"}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatTime(entry.totalStudyTime)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

