"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

export interface ResponsiveDialogProps extends DialogPrimitive.Root.Props {}

function ResponsiveDialog({ ...props }: ResponsiveDialogProps) {
  return <DialogPrimitive.Root data-slot="responsive-dialog" {...props} />
}

function ResponsiveDialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="responsive-dialog-trigger" {...props} />
}

function ResponsiveDialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="responsive-dialog-portal" {...props} />
}

function ResponsiveDialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="responsive-dialog-close" {...props} />
}

function ResponsiveDialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="responsive-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-slate-950/40 backdrop-blur-xs duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <ResponsiveDialogPortal>
      <ResponsiveDialogOverlay />
      <DialogPrimitive.Popup
        data-slot="responsive-dialog-content"
        className={cn(
          // Base & Mobile layout: Bottom sheet / Drawer with comfortable padding & safe-area margin
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl bg-card p-6 sm:p-7 md:p-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-card-foreground shadow-lift duration-200 outline-none",
          "data-open:animate-in data-open:slide-in-from-bottom data-open:fade-in-0",
          "data-closed:animate-out data-closed:slide-out-to-bottom data-closed:fade-out-0",
          // Desktop layout (md:): Centered Dialog with outer margin
          "md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[calc(100dvh-4rem)] md:my-8 md:rounded-3xl",
          "md:data-open:slide-in-from-bottom-0 md:data-open:zoom-in-95",
          "md:data-closed:slide-out-to-bottom-0 md:data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {/* Mobile drag handle indicator */}
        <div
          data-slot="responsive-dialog-handle"
          aria-hidden="true"
          className="mx-auto -mt-2 mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20 md:hidden"
        />

        {children}

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="responsive-dialog-close"
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-5 right-5 hidden size-8 rounded-full text-muted-foreground hover:bg-muted md:inline-flex cursor-pointer"
                aria-label="Close dialog"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            }
          />
        )}
      </DialogPrimitive.Popup>
    </ResponsiveDialogPortal>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-dialog-header"
      className={cn("flex shrink-0 flex-col gap-1.5 text-left pb-4 pt-1 pr-10 sm:pr-12", className)}
      {...props}
    />
  )
}

function ResponsiveDialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="responsive-dialog-title"
      className={cn("text-lg sm:text-xl font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

function ResponsiveDialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="responsive-dialog-description"
      className={cn("text-xs sm:text-sm text-muted-foreground leading-normal", className)}
      {...props}
    />
  )
}

function ResponsiveDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-dialog-body"
      className={cn("flex-1 min-h-0 overflow-y-auto py-3 px-1 sm:px-1.5 my-2 space-y-4", className)}
      {...props}
    />
  )
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-dialog-footer"
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2.5 pt-5 sm:pt-6 mt-3 sm:flex-row sm:justify-end sm:gap-3",
        className
      )}
      {...props}
    />
  )
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogPortal,
  ResponsiveDialogClose,
  ResponsiveDialogOverlay,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
}
