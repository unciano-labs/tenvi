'use client';

import React, { useState, useEffect } from 'react';
import { createTransactionAction } from '@/app/actions/transactions';
import { toast } from 'sonner';
import {
  PlusCircle,
  MinusCircle,
  Loader2,
  CreditCard as CreditCardIcon,
} from 'lucide-react';
import { Property, Category, CreditCard } from '@/types';
import { PAYMENT_METHODS } from '@/lib/constants';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';

interface PropertyTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  defaultPropertyId?: string;
  defaultKind?: 'income' | 'expense';
  categories: Category[];
  creditCards?: CreditCard[];
}

export function PropertyTransactionModal({
  isOpen,
  onClose,
  properties,
  defaultPropertyId,
  defaultKind = 'income',
  categories,
  creditCards = [],
}: PropertyTransactionModalProps) {
  const [kind, setKind] = useState<'income' | 'expense'>(defaultKind);
  const [propertyId, setPropertyId] = useState<string>(
    defaultPropertyId || (properties[0]?.id ?? '')
  );
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [creditCardId, setCreditCardId] = useState('');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKind(defaultKind);
      if (defaultPropertyId) {
        setPropertyId(defaultPropertyId);
      } else if (properties.length > 0 && !propertyId) {
        setPropertyId(properties[0].id);
      }
      setAmount('');
      setNote('');
      setOccurredOn(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, defaultKind, defaultPropertyId, properties]);

  const filteredCategories = categories.filter((c) => c.kind === kind);
  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Quick preset shortcuts for fast 1-click entries
  const handleQuickPreset = (presetNote: string, presetAmount?: number) => {
    setNote(presetNote);
    if (presetAmount) {
      setAmount(String(presetAmount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(/,/g, ''));
    if (!val || val <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (!propertyId) {
      toast.error('Please select a property or asset.');
      return;
    }

    setIsSubmitting(true);
    const res = await createTransactionAction({
      kind,
      amount: val,
      categoryId: categoryId || null,
      paymentMethod,
      creditCardId: paymentMethod === 'credit_card' ? creditCardId || null : null,
      propertyId,
      occurredOn,
      note: note.trim() || null,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        kind === 'income'
          ? 'Property revenue logged successfully!'
          : 'Property expense logged successfully!'
      );
      onClose();
    }
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader className="pr-10 sm:pr-12">
          <ResponsiveDialogTitle className="truncate">
            {kind === 'income' ? 'Record Asset Income' : 'Record Asset Expense'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="truncate">
            {kind === 'income'
              ? 'Log boundary, fares, booking revenue, or tenant rent'
              : 'Log amortization, insurance, repairs, fuel, or PMS'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <div className="space-y-4">
            {/* Kind Toggle (Income vs Expense) */}
            <div className="flex p-1.5 rounded-2xl bg-muted">
              <Button
                type="button"
                variant={kind === 'income' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setKind('income')}
                className={`flex-1 rounded-xl gap-1.5 font-bold ${
                  kind === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'text-muted-foreground'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Money In (Income)
              </Button>

              <Button
                type="button"
                variant={kind === 'expense' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setKind('expense')}
                className={`flex-1 rounded-xl gap-1.5 font-bold ${
                  kind === 'expense' ? 'shadow-xs' : 'text-muted-foreground'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5" />
                Money Out (Expense)
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Property Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Target Property / Asset</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  required
                  className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-semibold text-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.identifier ? `(${p.identifier})` : ''} • {p.property_type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Amount (₱)</label>
                <MoneyInput
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(val) => setAmount(val)}
                />
              </div>

              {/* Quick Preset Buttons */}
              {selectedProperty && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Quick 1-Click Suggestions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {kind === 'income' ? (
                      <>
                        {Number(selectedProperty.expected_income_daily || 0) > 0 && (
                          <Button
                            type="button"
                            size="xs"
                            variant="soft"
                            onClick={() =>
                              handleQuickPreset(
                                `Daily Boundary (${selectedProperty.identifier || selectedProperty.name})`,
                                Number(selectedProperty.expected_income_daily)
                              )
                            }
                            className="text-xs text-emerald-700 dark:text-emerald-400"
                          >
                            + Daily Boundary (₱{selectedProperty.expected_income_daily})
                          </Button>
                        )}
                        {Number(selectedProperty.expected_income_monthly || 0) > 0 && (
                          <Button
                            type="button"
                            size="xs"
                            variant="soft"
                            onClick={() =>
                              handleQuickPreset(
                                `Monthly Rent (${selectedProperty.name})`,
                                Number(selectedProperty.expected_income_monthly)
                              )
                            }
                            className="text-xs text-emerald-700 dark:text-emerald-400"
                          >
                            + Monthly Rent (₱{selectedProperty.expected_income_monthly})
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant="soft"
                          onClick={() => handleQuickPreset('Booking / Trip Fare')}
                          className="text-xs"
                        >
                          Trip Fare
                        </Button>
                      </>
                    ) : (
                      <>
                        {Number(selectedProperty.monthly_amortization || 0) > 0 && (
                          <Button
                            type="button"
                            size="xs"
                            variant="soft"
                            onClick={() =>
                              handleQuickPreset(
                                `Monthly Amortization (${selectedProperty.name})`,
                                Number(selectedProperty.monthly_amortization)
                              )
                            }
                            className="text-xs text-rose-700 dark:text-rose-400"
                          >
                            - Monthly Amort (₱{selectedProperty.monthly_amortization})
                          </Button>
                        )}
                        {Number(selectedProperty.annual_insurance_amount || 0) > 0 && (
                          <Button
                            type="button"
                            size="xs"
                            variant="soft"
                            onClick={() =>
                              handleQuickPreset(
                                `Annual Insurance Renewal (${selectedProperty.name})`,
                                Number(selectedProperty.annual_insurance_amount)
                              )
                            }
                            className="text-xs text-rose-700 dark:text-rose-400"
                          >
                            - Yearly Insurance (₱{selectedProperty.annual_insurance_amount})
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant="soft"
                          onClick={() => handleQuickPreset('Oil Change / PMS Maintenance')}
                          className="text-xs"
                        >
                          PMS / Maintenance
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="soft"
                          onClick={() => handleQuickPreset('Gas / Fuel')}
                          className="text-xs"
                        >
                          Gasoline / Fuel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a category (optional)</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:ring-2 focus:ring-ring capitalize"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Date</label>
                  <Input
                    type="date"
                    required
                    value={occurredOn}
                    onChange={(e) => setOccurredOn(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* If Credit Card, choose card */}
              {paymentMethod === 'credit_card' && creditCards.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-2xl bg-primary/10">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CreditCardIcon className="w-3.5 h-3.5 text-primary" />
                    Charge to Credit Card
                  </label>
                  <select
                    value={creditCardId}
                    onChange={(e) => setCreditCardId(e.target.value)}
                    className="w-full min-h-10 h-10 rounded-xl bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none"
                  >
                    <option value="">Select a card</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.bank_name} {c.name} (•••• {c.last_4})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description / Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Note / Description</label>
                <Input
                  type="text"
                  placeholder={
                    kind === 'income'
                      ? 'e.g. Daily Boundary via GCash, Tenant Rent'
                      : 'e.g. Annual Insurance, Monthly Amortization'
                  }
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="soft"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`gap-2 ${
                    kind === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {kind === 'income' ? 'Record Income' : 'Record Expense'}
                </Button>
              </div>
            </form>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
