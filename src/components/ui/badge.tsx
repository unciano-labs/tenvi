import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&>svg]:pointer-events-none [&>svg]:size-3.5 shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        soft: "bg-muted text-foreground [a]:hover:bg-muted/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/90",
        neutral: "bg-muted text-muted-foreground [a]:hover:bg-muted/80",
        success: "bg-success-soft text-success-soft-foreground [a]:hover:bg-success-soft/90",
        warning: "bg-warning-soft text-warning-soft-foreground [a]:hover:bg-warning-soft/90",
        danger: "bg-danger-soft text-danger-soft-foreground [a]:hover:bg-danger-soft/90",
        destructive: "bg-danger-soft text-danger-soft-foreground [a]:hover:bg-danger-soft/90",
        outline: "bg-muted/80 text-foreground [a]:hover:bg-muted",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps extends useRender.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
}

function Badge({
  className,
  variant = "default",
  icon,
  children,
  render,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: (
          <>
            {icon && <span className="shrink-0 inline-flex items-center">{icon}</span>}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
