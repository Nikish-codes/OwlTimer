"use client"

import * as React from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"

export interface CalendarProps {
  value?: Date
  onChange?: (date: Date | null) => void
  disabled?: boolean
  className?: string
}

function Calendar({ value, onChange, disabled, className }: CalendarProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <DatePicker
        selected={value}
        onChange={onChange}
        disabled={disabled}
        dateFormat="PPP"
        showTimeSelect={false}
        minDate={new Date()}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        wrapperClassName="w-full"
        customInput={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? value.toLocaleDateString() : "Pick a date"}
          </Button>
        }
      />
    </div>
  )
}

export { Calendar } 