"use client"

import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreakIndicatorProps {
  count: number
  className?: string
}

export function StreakIndicator({ count, className }: StreakIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Flame className="h-4 w-4 text-orange-500" />
      <span className="text-xs font-medium">{count}</span>
    </div>
  )
} 
