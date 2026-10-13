"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MoneyInput } from "@/components/ui/money-input"
import { DayOfMonthSelect } from "@/components/ui/day-of-month-select"

// Plain-language Zod validation schema
export const cardFormSchema = z.object({
  cardName: z
    .string()
    .min(1, "Please enter a name for this card.")
    .max(50, "Card name must be 50 characters or less."),
  bankName: z
    .string()
    .min(1, "Please choose or enter your bank name."),
  creditLimit: z
    .string()
    .min(1, "Please enter your credit limit.")
    .refine((val) => {
      const num = parseFloat(val.replace(/,/g, ""))
      return !isNaN(num) && num > 0
    }, "Credit limit must be greater than ₱0."),
  statementDay: z
    .number({ invalid_type_error: "Please pick the day your bill is made." })
    .min(1, "Day must be between 1 and 31.")
    .max(31, "Day must be between 1 and 31."),
  dueDay: z
    .number({ invalid_type_error: "Please pick your payment due day." })
    .min(1, "Day must be between 1 and 31.")
    .max(31, "Day must be between 1 and 31."),
})

export type CardFormValues = z.infer<typeof cardFormSchema>

interface ReferenceCardFormProps {
  onSubmitAction?: (data: CardFormValues) => Promise<{ success: boolean; message?: string }>
  onSuccess?: () => void
}

export function ReferenceCardForm({
  onSubmitAction,
  onSuccess,
}: ReferenceCardFormProps) {
  const [isPending, startTransition] = React.useTransition()

  const form = useForm<CardFormValues>({
    resolver: zodResolver(cardFormSchema),
    mode: "onBlur",
    defaultValues: {
      cardName: "",
      bankName: "",
      creditLimit: "",
      statementDay: 15,
      dueDay: 5,
    },
  })

  const onSubmit = (values: CardFormValues) => {
    startTransition(async () => {
      try {
        if (onSubmitAction) {
          const res = await onSubmitAction(values)
          if (res.success) {
            toast.success(res.message || "Card saved successfully.")
            form.reset()
            onSuccess?.()
          } else {
            toast.error(res.message || "Unable to save card. Please check your entries.")
          }
        } else {
          // Simulate 5-step server action delay
          await new Promise((r) => setTimeout(r, 600))
          toast.success("Card saved successfully.")
          form.reset()
          onSuccess?.()
        }
      } catch (err) {
        toast.error("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="cardName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Card Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. BDO Platinum or Personal Cashback"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A nickname to help you easily recognize this card.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Issuing Bank</FormLabel>
              <FormControl>
                <Input placeholder="e.g. BDO, BPI, UnionBank, RCBC" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="creditLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Credit Limit</FormLabel>
              <FormControl>
                <MoneyInput
                  placeholder="50,000.00"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              </FormControl>
              <FormDescription>
                Total spending limit provided by your bank.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="statementDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bill is made on</FormLabel>
                <FormControl>
                  <DayOfMonthSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Cutoff day"
                  />
                </FormControl>
                <FormDescription>Statement cutoff date</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pay by</FormLabel>
                <FormControl>
                  <DayOfMonthSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Due day"
                  />
                </FormControl>
                <FormDescription>Payment due date</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isPending ? "Saving card..." : "Save Card"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
