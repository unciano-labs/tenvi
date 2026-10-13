# Standard Form Pattern & Guidelines (TNV-006)

Tenvi uses a unified, accessible, and resilient form architecture powered by:
- **Form State**: `react-hook-form`
- **Validation**: `zod` via `@hookform/resolvers/zod`
- **Components**: shadcn/ui borderless form primitives (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription`)
- **Specialized Inputs**: `MoneyInput` (₱ prefix, grouping, numeric keyboard), `DayOfMonthSelect` (1st to 31st ordinal select)
- **Mutation Safety**: 5-step Server Action guard pattern

---

## 1. Design & Accessibility Rules

1. **Zero Decorative Borders**: Inputs, textareas, selects, and form containers use tonal surfaces (`bg-muted`), not borders.
2. **Explicit Touch Targets**: Minimum height is 48px (`min-h-12`) for default inputs/buttons, and 40px (`min-h-10`) for small variants.
3. **2px Focus Ring**: Focus states must use `focus-visible:ring-2 focus-visible:ring-ring` with offset 0.
4. **Validation Timing**: Set `mode: "onBlur"` in `useForm`. This ensures immediate feedback when leaving a field, as well as a complete re-check upon form submission.
5. **Screen Reader Feedback**: Validation errors render inside elements with `role="alert"` and are connected to inputs via `aria-describedby` and `aria-invalid`.

---

## 2. Plain-Language Zod Errors

Never use generic or developer-centric error messages like `"Invalid input"` or `"Expected number, received NaN"`. All error messages must be friendly, actionable, and in plain language:

```typescript
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
```

---

## 3. Specialized Financial Inputs

### `MoneyInput`
- Automatic Philippine Peso (`₱`) prefix addon.
- Number grouping (e.g. `1,234.50`).
- Mobile-optimized numeric keyboard via `inputMode="decimal"`.
- Clean value output to `react-hook-form` without messy formatting artifacts.

```tsx
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
      <FormDescription>Total spending limit provided by your bank.</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### `DayOfMonthSelect`
- Pre-populated ordinal options (1st to 31st).
- Standardized dropdown selection for statement cutoff and payment due dates.

```tsx
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
```

---

## 4. The 5-Step Server Action Mutation Guard

Every server mutation in Tenvi must follow the 5-step guard:

```typescript
export async function createCardAction(rawData: unknown) {
  // 1. Authenticate user session
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: "Unauthorized. Please log in." }
  }

  // 2. Verify tenant scope
  const websiteId = process.env.NEXT_PUBLIC_WEBSITE_ID
  if (!websiteId) {
    throw new Error("Missing website scope")
  }

  // 3. Validate inputs with Zod
  const parsed = cardFormSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid form submission",
    }
  }

  // 4. Scoped database write (RLS + composite tenant filters)
  const { data, error } = await supabase
    .from("bili_credit_cards")
    .insert({
      website_id: websiteId,
      user_id: user.id,
      card_name: parsed.data.cardName,
      bank_name: parsed.data.bankName,
      credit_limit: parseFloat(parsed.data.creditLimit.replace(/,/g, "")),
      statement_day: parsed.data.statementDay,
      due_day: parsed.data.dueDay,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // 5. Invalidate cache & return typed result
  revalidatePath("/dashboard/cards")
  return { success: true, data }
}
```

---

## 5. Submit States & Pending Feedback

Buttons must:
1. Transition smoothly to a pending state with `useTransition()`.
2. Display a spinning loader (`Loader2`) and descriptive label (e.g., `"Saving card..."`).
3. Be strictly `disabled` while pending to prevent double-submits.
4. Notify the user with a Sonner toast upon success or error.
