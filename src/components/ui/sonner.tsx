"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 text-success" />
        ),
        info: (
          <InfoIcon className="size-5 text-primary" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5 text-warning" />
        ),
        error: (
          <OctagonXIcon className="size-5 text-danger" />
        ),
        loading: (
          <Loader2Icon className="size-5 text-muted-foreground animate-spin" />
        ),
      }}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast flex items-center gap-3 w-full rounded-2xl bg-card p-4 text-sm font-medium text-card-foreground shadow-lift border-0 outline-none",
          description: "text-xs text-muted-foreground",
          actionButton:
            "rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer",
          cancelButton:
            "rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors cursor-pointer",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "transparent",
          "--border-radius": "1.25rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
