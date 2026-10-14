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
import {
  CreditCard as CardIcon,
  HelpCircle,
  Palette,
  Check,
  Loader2,
} from 'lucide-react';
import {
  parseCardStyle,
  formatCardStyle,
  CARD_ACCENTS,
  CARD_THEMES,
  CARD_PATTERNS,
  CardThemeId,
  CardAccentId,
  CardNetwork,
  CardPatternId,
  CardPatternOverlay,
  EmvChip,
  ContactlessWave,
  VisaLogo,
  MastercardLogo,
} from '@/components/Cards/CardThemeTokens';

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
          {/* Live Card Preview matching the solid accent design */}
          {(() => {
            const { theme, network, pattern } = parseCardStyle(watchedColor || 'cyan', watchedName);
            const parsedLimit = watchedLimit ? parseFloat(watchedLimit.replace(/,/g, '') || '0') : 0;

            return (
              <div
                className={`w-full rounded-[22px] p-4 sm:p-5 text-white border ${theme.borderColor} ${theme.bgColor} ${theme.glowShadow} relative overflow-hidden transition-all duration-300 shadow-card flex flex-col justify-between`}
                style={{ aspectRatio: '1.58 / 1', minHeight: '210px' }}
              >
                {/* Accent top highlight line */}
                <div className={`absolute top-0 inset-x-8 h-[2px] ${theme.barColor} opacity-70 z-10`} />

                {/* Background Pattern Overlay */}
                <CardPatternOverlay pattern={pattern} accentHex={theme.accentHex} />

                {/* Top: Bank & Nickname */}
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-xs sm:text-sm tracking-wider uppercase text-white/95">
                      {resolvedDisplayBank || 'ISSUING BANK'}
                    </h4>
                    <p className="text-[11px] text-white/70 font-medium">
                      {watchedName || 'Card Nickname'}
                    </p>
                  </div>
                  <div className="size-6 rounded-full bg-white/10 flex items-center justify-center">
                    <CardIcon className="size-3 text-white/70" />
                  </div>
                </div>

                {/* Middle: Chip + Available Spending */}
                <div className="relative z-10 flex items-center justify-between my-auto py-1">
                  <div className="flex items-center gap-2">
                    <EmvChip />
                    <ContactlessWave />
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-medium text-white/60 block tracking-wide uppercase">
                      Available Spending:
                    </span>
                    <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                      ₱{parsedLimit.toLocaleString('en-PH')}
                    </span>
                  </div>
                </div>

                {/* Bottom: Dots + Network Logo */}
                <div className="relative z-10 flex items-end justify-between pt-1">
                  <div className="font-mono text-xs sm:text-sm font-semibold tracking-widest text-white/80">
                    •••• •••• •••• {watchedLast4 ? watchedLast4.padStart(4, '•') : '••••'}
                  </div>

                  <div className="flex items-center">
                    {network === 'mastercard' ? (
                      <MastercardLogo className="h-5" />
                    ) : (
                      <VisaLogo className="h-4" />
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

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

              {/* Color & Appearance Customization - Directly visible */}
              <div className="pt-2 border-t border-border/40 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Palette className="size-3.5" />
                  <span>Card Appearance (Color, Pattern & Network)</span>
                </div>
                  {/* Color Swatch Selector - 20 colors, scrollable, pure clickable circles without text */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Card Color
                      </span>
                      <span className="text-3xs text-muted-foreground font-medium">Scroll for more &rarr;</span>
                    </div>
                    <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin scroll-smooth">
                      {Object.values(CARD_ACCENTS).map((acc) => {
                        const { themeId, network, pattern } = parseCardStyle(watchedColor || 'cyan', watchedName);
                        const isSelected = themeId === acc.id;

                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              form.setValue('colorTheme', formatCardStyle(acc.id, network, pattern));
                            }}
                            className={`size-8 sm:size-9 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-xs shrink-0 ${
                              isSelected
                                ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110 shadow-md'
                                : 'hover:opacity-90'
                            }`}
                            style={{ backgroundColor: acc.accentHex }}
                            title={acc.name}
                            aria-label={acc.name}
                          >
                            {isSelected && <Check className="size-4 text-white drop-shadow stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Background Pattern Selector - 10 patterns */}
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-2xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                      Background Accent Pattern (10 options)
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {CARD_PATTERNS.map((p) => {
                        const { themeId, network, pattern } = parseCardStyle(watchedColor || 'cyan', watchedName);
                        const isSelected = pattern === p.id;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              form.setValue('colorTheme', formatCardStyle(themeId, network, p.id));
                            }}
                            className={`h-9 px-1 rounded-xl border text-2xs font-semibold flex items-center justify-center cursor-pointer transition-all truncate ${
                              isSelected
                                ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                                : 'border-border/60 hover:bg-muted text-muted-foreground'
                            }`}
                            title={p.name}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Network Selector (Visa vs Mastercard) */}
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-2xs font-semibold text-muted-foreground block mb-2 uppercase tracking-wider">
                      Card Network
                    </span>
                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                      {(() => {
                        const { themeId, network, pattern } = parseCardStyle(watchedColor || 'cyan', watchedName);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                form.setValue('colorTheme', formatCardStyle(themeId, 'visa', pattern));
                              }}
                              className={`h-11 rounded-xl border flex items-center justify-center gap-2 p-2 cursor-pointer transition-all ${
                                network === 'visa'
                                  ? 'bg-primary/10 border-primary text-primary font-bold'
                                  : 'bg-muted/40 border-border/60 hover:bg-muted text-muted-foreground'
                              }`}
                            >
                              <span className="font-black italic text-base">VISA</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                form.setValue('colorTheme', formatCardStyle(themeId, 'mastercard', pattern));
                              }}
                              className={`h-11 rounded-xl border flex items-center justify-center gap-2 p-2 cursor-pointer transition-all ${
                                network === 'mastercard'
                                  ? 'bg-primary/10 border-primary font-bold'
                                  : 'bg-muted/40 border-border/60 hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="size-4 rounded-full bg-[#EB001B]" />
                                <div className="size-4 rounded-full bg-[#F79E1B] -ml-2 opacity-95" />
                              </div>
                              <span className="text-xs font-bold text-foreground">Mastercard</span>
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
              </div>
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
