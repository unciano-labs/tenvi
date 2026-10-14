'use client';

import React, { useState, useEffect } from 'react';
import { createLiabilityAction, updateLiabilityAction } from '@/app/actions/liabilities';
import { toast } from 'sonner';
import {
  Building2,
  Car,
  Landmark,
  ShieldAlert,
  Loader2,
  Calendar,
  Percent,
} from 'lucide-react';
import { Liability, LiabilityType, Property } from '@/types';
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

interface LiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  liability?: Liability | null;
  defaultPropertyId?: string | null;
  properties?: Property[];
}

const LIABILITY_TYPES: { value: LiabilityType; label: string; icon: string }[] = [
  { value: 'mortgage', label: 'Mortgage / Housing Loan', icon: 'Building2' },
  { value: 'auto_loan', label: 'Auto Loan / Vehicle Financing', icon: 'Car' },
  { value: 'personal_loan', label: 'Bank Personal Loan', icon: 'Landmark' },
  { value: 'business_loan', label: 'Business / Commercial Loan', icon: 'Landmark' },
  { value: 'student_loan', label: 'Student / Education Loan', icon: 'Landmark' },
  { value: 'other', label: 'Other Long-Term Liability', icon: 'Landmark' },
];

export function LiabilityModal({
  isOpen,
  onClose,
  liability,
  defaultPropertyId,
  properties = [],
}: LiabilityModalProps) {
  const isEditing = !!liability;

  const [name, setName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [liabilityType, setLiabilityType] = useState<LiabilityType>('mortgage');
  const [originalPrincipal, setOriginalPrincipal] = useState('');
  const [currentPrincipalBalance, setCurrentPrincipalBalance] = useState('');
  const [annualInterestRate, setAnnualInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [startDate, setStartDate] = useState('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'paid_off' | 'refinanced' | 'defaulted'>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (liability) {
      setName(liability.name);
      setLenderName(liability.lender_name);
      setLiabilityType(liability.liability_type);
      setOriginalPrincipal(
        liability.original_principal ? String(liability.original_principal) : ''
      );
      setCurrentPrincipalBalance(
        liability.current_principal_balance ? String(liability.current_principal_balance) : ''
      );
      setAnnualInterestRate(
        liability.annual_interest_rate ? String(liability.annual_interest_rate) : ''
      );
      setTermMonths(liability.term_months ? String(liability.term_months) : '');
      setMonthlyPayment(liability.monthly_payment ? String(liability.monthly_payment) : '');
      setDueDay(liability.due_day ? String(liability.due_day) : '');
      setStartDate(liability.start_date || '');
      setPropertyId(liability.property_id || defaultPropertyId || '');
      setStatus(liability.status || 'active');
      setNotes(liability.notes || '');
    } else {
      setName('');
      setLenderName('');
      setLiabilityType('mortgage');
      setOriginalPrincipal('');
      setCurrentPrincipalBalance('');
      setAnnualInterestRate('');
      setTermMonths('');
      setMonthlyPayment('');
      setDueDay('');
      setStartDate('');
      setPropertyId(defaultPropertyId || '');
      setStatus('active');
      setNotes('');
    }
  }, [liability, defaultPropertyId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a nickname for this liability.');
      return;
    }
    if (!lenderName.trim()) {
      toast.error('Please enter the bank or lender name.');
      return;
    }
    if (!currentPrincipalBalance || Number(currentPrincipalBalance) < 0) {
      toast.error('Please enter the current outstanding balance.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        lenderName: lenderName.trim(),
        liabilityType,
        originalPrincipal: originalPrincipal ? Number(originalPrincipal) : Number(currentPrincipalBalance),
        currentPrincipalBalance: Number(currentPrincipalBalance),
        annualInterestRate: annualInterestRate ? Number(annualInterestRate) : 0,
        termMonths: termMonths ? Number(termMonths) : null,
        monthlyPayment: monthlyPayment ? Number(monthlyPayment) : 0,
        dueDay: dueDay ? Number(dueDay) : null,
        startDate: startDate || null,
        propertyId: propertyId ? propertyId : null,
        status,
        notes: notes.trim() || null,
      };

      if (isEditing) {
        const res = await updateLiabilityAction({
          ...payload,
          liabilityId: liability.id,
        });
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Liability updated successfully.');
          onClose();
        }
      } else {
        const res = await createLiabilityAction(payload as any);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Liability added to balance sheet.');
          onClose();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong saving liability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <ResponsiveDialogHeader className="p-6 pb-2">
          <ResponsiveDialogTitle>
            {isEditing ? 'Edit Debt / Liability' : 'Add Mortgage or Loan Liability'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Accurately model long-term debt, amortizations, and calculate net owner equity against your assets.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="overflow-y-auto px-6 py-2 space-y-5">
          <form id="liability-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Nickname & Lender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Liability Nickname *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BPI Housing Loan"
                  className="rounded-2xl"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Bank / Lender Name *
                </label>
                <Input
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="e.g. BPI Family, Metrobank"
                  className="rounded-2xl"
                  required
                />
              </div>
            </div>

            {/* Liability Type & Linked Property */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Liability Type
                </label>
                <select
                  value={liabilityType}
                  onChange={(e) => setLiabilityType(e.target.value as LiabilityType)}
                  className="w-full h-11 px-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  {LIABILITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Link to Property / Asset (Optional)
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="">No linked asset (Standalone debt)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.property_type.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Current Principal Balance *
                </label>
                <MoneyInput
                  value={currentPrincipalBalance}
                  onChange={setCurrentPrincipalBalance}
                  placeholder="0.00"
                  className="rounded-2xl"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Amount remaining to fully pay off.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Original Loan Principal
                </label>
                <MoneyInput
                  value={originalPrincipal}
                  onChange={setOriginalPrincipal}
                  placeholder="0.00"
                  className="rounded-2xl"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Original borrowed amount.
                </span>
              </div>
            </div>

            {/* Interest Rate & Monthly Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Annual Interest (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={annualInterestRate}
                  onChange={(e) => setAnnualInterestRate(e.target.value)}
                  placeholder="e.g. 6.5"
                  className="rounded-2xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Monthly Amortization
                </label>
                <MoneyInput
                  value={monthlyPayment}
                  onChange={setMonthlyPayment}
                  placeholder="0.00"
                  className="rounded-2xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Monthly Due Day
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="e.g. 15"
                  className="rounded-2xl"
                />
              </div>
            </div>

            {/* Term & Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Loan Term (Months)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  placeholder="e.g. 180 (15 yrs)"
                  className="rounded-2xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Loan Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Account or Loan Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Account number, branch, contact person, or special terms..."
                className="w-full h-20 p-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </form>
        </ResponsiveDialogBody>

        <div className="p-4 border-t flex items-center justify-end gap-2 bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl font-bold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="liability-form"
            disabled={isSubmitting}
            className="rounded-2xl font-bold shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Saving...
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Add Liability'
            )}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
