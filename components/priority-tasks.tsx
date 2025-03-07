"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useFirebase } from './firebase-provider'
import { collection, query, where, orderBy, limit, getFirestore } from 'firebase/firestore'
import { useCollection } from 'react-firebase-hooks/firestore'
import { Badge } from "@/components/ui/badge"

interface PriorityTasksProps {
  expanded?: boolean;
}

export function PriorityTasks({ expanded = false }: PriorityTasksProps) {
  const { db, user } = useFirebase()

  const [tasks, loading] = useCollection(
    user
      ? query(
        collection(db, 'todos'),
        where('userId', '==', user.uid),
        where('completed', '==', false),
        orderBy('priority', 'desc'),
        limit(5)
      )
      : null
  )

  if (!user) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Priority Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Loading...</div>
        ) : tasks?.empty || tasks?.docs.filter(doc => doc.data().priority !== undefined).length === 0 ? (
          <div className="text-center text-muted-foreground">No priority tasks</div>
        ) : (
          <ul className="space-y-2">
            {tasks?.docs.filter(doc => doc.data().priority !== undefined).map((doc) => {
              const task = doc.data()
              return (
                <li key={doc.id} className="flex items-center justify-between">
                  <span>{task.text}</span>
                  <div className="flex gap-2">
                    <Badge>{task.subject}</Badge>
                    <Badge variant="outline">{task.priority}</Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

