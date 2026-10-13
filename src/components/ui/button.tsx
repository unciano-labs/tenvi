import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.99]",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.99]",
        soft: "bg-muted text-foreground hover:bg-muted/80 active:scale-[0.99]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.99]",
        ghost: "bg-transparent hover:bg-muted hover:text-foreground active:scale-[0.99]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.99]",
        "destructive-soft": "bg-danger-soft text-danger-soft-foreground hover:bg-danger-soft/80 active:scale-[0.99]",
        outline: "bg-muted/60 text-foreground hover:bg-muted active:scale-[0.99]",
        link: "text-primary underline-offset-4 hover:underline min-h-auto h-auto p-0",
      },
      size: {
        default: "min-h-12 h-12 gap-2 px-5 text-sm sm:text-base rounded-xl",
        sm: "min-h-10 h-10 gap-1.5 px-3.5 text-xs sm:text-sm rounded-lg",
        xs: "min-h-8 h-8 gap-1 px-2.5 text-xs rounded-md",
        lg: "min-h-14 h-14 gap-2.5 px-6 text-base sm:text-lg rounded-2xl",
        icon: "size-12 min-h-12 min-w-12 rounded-xl",
        "icon-sm": "size-10 min-h-10 min-w-10 rounded-lg",
        "icon-xs": "size-8 min-h-8 min-w-8 rounded-md",
        "icon-lg": "size-14 min-h-14 min-w-14 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const isNative =
    nativeButton !== undefined
      ? nativeButton
      : render
      ? (React.isValidElement(render) && render.type === "button")
      : true

  return (
    <ButtonPrimitive
      data-slot="button"
      render={render}
      nativeButton={isNative}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
