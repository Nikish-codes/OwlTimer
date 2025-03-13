"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell } from "lucide-react"
import { requestNotificationPermission } from '@/lib/notifications'

interface ReminderSettingsProps {
  defaultValue?: number // minutes before
  onSave: (minutes: number) => void
  onDisable: () => void
  enabled?: boolean
}

export function ReminderSettings({ 
  defaultValue = 30,
  onSave,
  onDisable,
  enabled = false
}: ReminderSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [minutes, setMinutes] = useState(defaultValue.toString())

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        return // Don't enable if permission not granted
      }
      setIsEnabled(true)
      onSave(parseInt(minutes))
    } else {
      setIsEnabled(false)
      onDisable()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <Label htmlFor="notifications">Enable Reminders</Label>
        </div>
        <Switch
          id="notifications"
          checked={isEnabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {isEnabled && (
        <div className="space-y-2">
          <Label>Remind me before</Label>
          <Select
            value={minutes}
            onValueChange={(value) => {
              setMinutes(value)
              onSave(parseInt(value))
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
              <SelectItem value="1440">1 day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
} 
