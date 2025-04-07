"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from './firebase-provider'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalTime: number;
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export function Leaderboard() {
  const { user, db } = useFirebase()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionsQuery = query(
      collection(db, 'study-sessions'),
      where('date', '>=', today.toISOString()),
      orderBy('date', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      // Group sessions by user and calculate total time
      const userTotals = new Map<string, { displayName: string; totalTime: number }>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const duration = data.duration || 0;
        
        const userTotal = userTotals.get(data.userId) || { 
          displayName: data.username || 'Anonymous',
          totalTime: 0 
        };
        userTotal.totalTime += duration;
        userTotals.set(data.userId, userTotal);
      });

      // Convert to array and sort by total time
      const sortedEntries = Array.from(userTotals.entries())
        .map(([userId, data]) => ({
          userId,
          displayName: data.displayName,
          totalTime: Math.round(data.totalTime) // Round to nearest minute
        }))
        .sort((a, b) => b.totalTime - a.totalTime);

      setEntries(sortedEntries);
      setLoading(false);
    }, (error) => {
      console.error('Error loading leaderboard:', error);
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [db]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry: LeaderboardEntry, index: number) => (
            <div
              key={entry.userId}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-white",
                  index === 0 ? "bg-yellow-500" :
                  index === 1 ? "bg-gray-400" :
                  index === 2 ? "bg-amber-600" :
                  "bg-gray-200"
                )}>
                  {index + 1}
                </div>
                <div>
                  {entry.displayName}
                  {entry.userId === user?.uid && " (You)"}
                </div>
              </div>
              <div>{formatTime(entry.totalTime)}</div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="text-center text-muted-foreground">
              No study sessions recorded today
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

