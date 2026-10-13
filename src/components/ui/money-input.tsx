"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface MoneyInputProps
  extends Omit<React.ComponentProps<"input">, "size" | "onChange" | "value"> {
  value?: string | number
  onChange?: (value: string) => void
  onValueChange?: (values: { value: string; floatValue?: number }) => void
  currencySymbol?: string
  size?: "default" | "sm"
  error?: boolean
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      className,
      value,
      onChange,
      onValueChange,
      currencySymbol = "₱",
      size = "default",
      error,
      disabled,
      placeholder = "0.00",
      onBlur,
      ...props
    },
    ref
  ) => {
    // Format display string with commas: "1234.50" -> "1,234.50"
    const formatDisplay = (raw: string | number | undefined): string => {
      if (raw === undefined || raw === null || raw === "") return ""
      const str = String(raw).replace(/,/g, "")
      const parts = str.split(".")
      const integerPart = parts[0]
      const formattedInt = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      if (parts.length > 1) {
        return `${formattedInt}.${parts[1]}`
      }
      return formattedInt
    }

    const [displayVal, setDisplayVal] = React.useState<string>(() =>
      formatDisplay(value)
    )

    React.useEffect(() => {
      setDisplayVal(formatDisplay(value))
    }, [value])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawVal = e.target.value
      // Allow only numbers, commas, and at most one decimal point
      const cleaned = rawVal.replace(/[^\d.]/g, "")
      const dotParts = cleaned.split(".")
      const validCleaned =
        dotParts.length > 2
          ? `${dotParts[0]}.${dotParts.slice(1).join("")}`
          : cleaned

      const formatted = formatDisplay(validCleaned)
      setDisplayVal(formatted)

      // Notify consumer of standard unformatted decimal string e.g. "1234.56"
      const numericString = validCleaned
      onChange?.(numericString)
      onValueChange?.({
        value: numericString,
        floatValue: numericString === "" ? undefined : parseFloat(numericString),
      })
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Optional clean-up on blur
      onBlur?.(e)
    }

    return (
      <div
        data-slot="money-input-container"
        className={cn(
          "relative flex w-full items-center rounded-xl bg-muted transition-all outline-none",
          size === "sm" ? "min-h-10 h-10 px-3" : "min-h-12 h-12 px-3.5",
          "focus-within:ring-2 focus-within:ring-ring",
          error && "ring-2 ring-destructive",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span
          data-slot="money-symbol"
          className="select-none pr-1.5 font-semibold text-muted-foreground text-base tracking-tight"
          aria-hidden="true"
        >
          {currencySymbol}
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={displayVal}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={cn(
            "w-full flex-1 bg-transparent text-foreground placeholder:text-muted-foreground font-medium outline-none",
            size === "sm" ? "text-sm" : "text-base",
            "disabled:cursor-not-allowed"
          )}
          {...props}
        />
      </div>
    )
  }
)

MoneyInput.displayName = "MoneyInput"
