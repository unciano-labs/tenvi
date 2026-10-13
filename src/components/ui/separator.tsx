"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-muted/60 data-horizontal:h-1 data-horizontal:w-full data-horizontal:rounded-full data-vertical:w-1 data-vertical:rounded-full data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
