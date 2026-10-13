"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" && "h-6 w-11 bg-muted ring-1 ring-muted-foreground/20 data-checked:bg-primary data-checked:ring-0",
        size === "sm" && "h-5 w-9 bg-muted ring-1 ring-muted-foreground/20 data-checked:bg-primary data-checked:ring-0",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-xs transition-transform",
          size === "default" && "size-5 data-checked:translate-x-5.5 data-unchecked:translate-x-0.5",
          size === "sm" && "size-4 data-checked:translate-x-4.5 data-unchecked:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
