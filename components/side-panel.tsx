"use client"

import React from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { ThoughtJournal } from "@/components/thought-journal"
import { useFirebase } from "@/components/firebase-provider"

interface SidePanelProps {
  expanded?: boolean
}

export function SidePanel({ expanded = false }: SidePanelProps) {
  const { user } = useFirebase()
  
  return (
    <div className={`flex flex-col gap-4 transition-all duration-300 ${expanded ? 'w-full' : 'w-full'}`}>
      <Card>
        <CardContent className="pt-4">
          <ThoughtJournal />
        </CardContent>
      </Card>
    </div>
  )
} 