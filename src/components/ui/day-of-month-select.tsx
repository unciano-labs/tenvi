"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface DayOfMonthSelectProps {
  value?: number | string
  onValueChange?: (value: number) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  size?: "default" | "sm"
  className?: string
  suffix?: string
}

function getOrdinalSuffix(day: number): string {
  const j = day % 10
  const k = day % 100
  if (j === 1 && k !== 11) {
    return "st"
  }
  if (j === 2 && k !== 12) {
    return "nd"
  }
  if (j === 3 && k !== 13) {
    return "rd"
  }
  return "th"
}

export function DayOfMonthSelect({
  value,
  onValueChange,
  placeholder = "Select day of month",
  disabled,
  error,
  size = "default",
  className,
  suffix = "of each month",
}: DayOfMonthSelectProps) {
  const stringValue = value !== undefined && value !== null && value !== "" ? String(value) : undefined

  const days = React.useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => {
      const day = i + 1
      const ordinal = `${day}${getOrdinalSuffix(day)}`
      const label = suffix ? `${ordinal} ${suffix}` : ordinal
      return { day, value: String(day), label }
    })
  }, [suffix])

  const handleValueChange = (val: string | null) => {
    if (val && onValueChange) {
      onValueChange(parseInt(val, 10))
    }
  }

  return (
    <Select
      value={stringValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        size={size}
        aria-invalid={error}
        className={cn(error && "ring-2 ring-destructive", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-60">
        {days.map(({ value: dayVal, label }) => (
          <SelectItem key={dayVal} value={dayVal}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
