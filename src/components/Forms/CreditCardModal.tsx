"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { createCreditCardAction, updateCreditCardAction } from '@/app/actions/cards';
import { PH_CREDIT_CARD_BANKS } from '@/lib/constants';
import { CreditCard } from '@/types';

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
} from '@/components/ui/responsive-dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { DayOfMonthSelect } from '@/components/ui/day-of-month-select';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  CreditCard as CardIcon,
  HelpCircle,
  Palette,
  Check,
  ChevronDown,
  Loader2,
} from 'lucide-react';

const PRESET_CARD_COLORS = [
  { id: '#0f172a', name: 'Charcoal Black', hex: '#0f172a' },
  { id: '#1e3a8a', name: 'Royal Navy', hex: '#1e3a8a' },
  { id: '#065f46', name: 'Forest Emerald', hex: '#065f46' },
  { id: '#9f1239', name: 'Burgundy Crimson', hex: '#9f1239' },
  { id: '#92400e', name: 'Bronze Amber', hex: '#92400e' },
  { id: '#581c87', name: 'Imperial Purple', hex: '#581c87' },
  { id: '#0f766e', name: 'Deep Teal', hex: '#0f766e' },
  { id: '#334155', name: 'Graphite Slate', hex: '#334155' },
];

const creditCardFormSchema = z.object({
  bankName: z.string().min(1, 'Please select or enter the bank name.'),
  customBank: z.string().optional(),
  name: z.string().min(1, 'Please enter a card nickname (e.g. Platinum Visa).').max(50),
  last4: z
    .string()
    .length(4, 'Please enter exactly the last 4 digits.')
    .regex(/^\d{4}$/, 'Last 4 digits must contain numbers only.'),
  creditLimit: z
    .string()
    .min(1, 'Please enter your credit limit.')
    .refine((val) => {
      const num = parseFloat(val.replace(/,/g, ''));
      return !isNaN(num) && num >= 0;
    }, 'Credit limit cannot be negative.'),
  statementDay: z
    .number({ invalid_type_error: 'Please pick your statement day.' })
    .min(1)
    .max(31),
  dueDay: z
    .number({ invalid_type_error: 'Please pick your payment due day.' })
    .min(1)
    .max(31),
  colorTheme: z.string().default('#0f172a'),
});

type CreditCardFormValues = z.infer<typeof creditCardFormSchema>;

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: CreditCard | null;
}

export function CreditCardModal({ isOpen, onClose, card }: CreditCardModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isColorOpen, setIsColorOpen] = useState(false);
  const isEditing = Boolean(card);

  const form = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardFormSchema),
    mode: 'onBlur',
    defaultValues: {
      bankName: PH_CREDIT_CARD_BANKS[0],
      customBank: '',
      name: '',
      last4: '',
      creditLimit: '',
      statementDay: 15,
      dueDay: 5,
      colorTheme: '#0f172a',
    },
  });

  useEffect(() => {
    if (card) {
      const isKnownBank = (PH_CREDIT_CARD_BANKS as readonly string[]).includes(card.bank_name);
      form.reset({
        bankName: isKnownBank ? card.bank_name : 'Other Bank',
        customBank: isKnownBank ? '' : card.bank_name,
        name: card.name || '',
        last4: card.last_4 || '',
        creditLimit: card.credit_limit ? String(card.credit_limit) : '',
        statementDay: Number(card.statement_day || 15),
        dueDay: Number(card.due_day || 5),
        colorTheme: card.color_theme || '#0f172a',
      });
    } else {
      form.reset({
        bankName: PH_CREDIT_CARD_BANKS[0],
        customBank: '',
        name: '',
        last4: '',
        creditLimit: '',
        statementDay: 15,
        dueDay: 5,
        colorTheme: '#0f172a',
      });
    }
  }, [card, isOpen, form]);

  const watchedBank = form.watch('bankName');
  const watchedCustomBank = form.watch('customBank');
  const watchedName = form.watch('name');
  const watchedLast4 = form.watch('last4');
  const watchedLimit = form.watch('creditLimit');
  const watchedColor = form.watch('colorTheme');

  const resolvedDisplayBank = watchedBank === 'Other Bank' ? watchedCustomBank || 'Bank Name' : watchedBank;

  const onSubmit = (values: CreditCardFormValues) => {
    const finalBank = values.bankName === 'Other Bank' ? values.customBank?.trim() || 'Other Bank' : values.bankName;

    const payload = {
      name: values.name.trim(),
      bankName: finalBank,
      last4: values.last4.trim(),
      creditLimit: parseFloat(values.creditLimit.replace(/,/g, '')),
      statementDay: values.statementDay,
      dueDay: values.dueDay,
      colorTheme: values.colorTheme,
    };

    startTransition(async () => {
      try {
        if (isEditing && card) {
          const res = await updateCreditCardAction(card.id, payload);
          if (res?.error) {
            toast.error(res.error);
          } else {
            toast.success('Credit card updated successfully.');
            onClose();
          }
        } else {
          const res = await createCreditCardAction(payload);
          if (res?.error) {
            toast.error(res.error);
          } else {
            toast.success('Credit card added successfully.');
            onClose();
          }
        }
      } catch (err) {
        toast.error('An error occurred. Please try again.');
      }
    });
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent className="max-w-xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEditing ? 'Edit Credit Card' : 'Add a Credit Card'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Configure your card's billing cycle to automatically track payment due dates.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-6">
          {/* Live Card Preview (TNV-027) */}
          <div
            className="rounded-2xl p-5 text-white shadow-card transition-all duration-300 relative overflow-hidden"
            style={{ backgroundColor: watchedColor || '#0f172a' }}
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                {resolvedDisplayBank}
              </span>
              <CardIcon className="size-6 text-white/70" />
            </div>
            <div className="mt-6 mb-2">
              <p className="font-mono text-base tracking-widest text-white/90">
                •••• •••• •••• {watchedLast4 ? watchedLast4.padStart(4, '•') : '••••'}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xs font-medium text-white/60 uppercase">Card Nickname</p>
                <p className="text-sm font-bold text-white truncate max-w-[200px]">
                  {watchedName || 'Personal Card'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xs font-medium text-white/60 uppercase">Credit Limit</p>
                <p className="text-sm font-bold text-white">
                  ₱{watchedLimit ? parseFloat(watchedLimit.replace(/,/g, '') || '0').toLocaleString('en-PH') : '0'}
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form id="credit-card-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Bank Selection */}
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Bank</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="min-h-12 h-12 bg-muted">
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {PH_CREDIT_CARD_BANKS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                          <SelectItem value="Other Bank">Other Bank</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedBank === 'Other Bank' && (
                <FormField
                  control={form.control}
                  name="customBank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specify Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter issuing bank name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Card Nickname & Last 4 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Nickname</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. BDO Platinum or Personal Cashback" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="last4"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last 4 Digits</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="4242"
                            maxLength={4}
                            inputMode="numeric"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Credit Limit */}
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
                      Total line of credit granted by your bank.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cycle Dates with Helper Popover */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Billing Schedule</span>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none"
                        />
                      }
                    >
                      <HelpCircle className="size-3.5" />
                      <span>Where do I find this?</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-4 space-y-2 text-xs">
                      <p className="font-semibold text-foreground">Understanding Billing Dates</p>
                      <p className="text-muted-foreground">
                        <strong>Bill is made:</strong> The monthly date your bank finalizes your transactions and issues the bill.
                      </p>
                      <p className="text-muted-foreground">
                        <strong>Pay by:</strong> The deadline by which your bill must be paid to avoid late fees and finance charges.
                      </p>
                      <p className="text-muted-foreground">
                        Both dates are printed on your physical or electronic monthly PDF statement.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>

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
                            placeholder="Select day bill is made"
                          />
                        </FormControl>
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
                            placeholder="Select pay by day"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Color Customization (TNV-027) */}
              <Collapsible open={isColorOpen} onOpenChange={setIsColorOpen} className="pt-2">
                <CollapsibleTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                    />
                  }
                >
                  <Palette className="size-3.5" />
                  <span>Customize card color</span>
                  <ChevronDown
                    className={`size-3.5 transition-transform duration-200 ${
                      isColorOpen ? 'rotate-180' : ''
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_CARD_COLORS.map((preset) => {
                      const isSelected = watchedColor === preset.hex;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => form.setValue('colorTheme', preset.hex)}
                          className={`relative flex size-10 items-center justify-center rounded-xl transition-transform hover:scale-105 cursor-pointer shadow-xs ${
                            isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        >
                          {isSelected && <Check className="size-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </form>
          </Form>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter>
          <ResponsiveDialogClose
            render={
              <Button variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            }
          />
          <Button
            type="submit"
            form="credit-card-form"
            variant="primary"
            disabled={isPending}
            className="min-h-12 h-12 px-6"
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isPending ? 'Saving card...' : isEditing ? 'Update Card' : 'Save Card'}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
