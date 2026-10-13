'use client';

import React, { useState } from 'react';
import { recordLoanPaymentAction } from '@/app/actions/loans';
import { toast } from 'sonner';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Loan } from '@/types';
import { formatMoney } from '@/lib/finance/calculations';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { MoneyInput } from '@/components/ui/money-input';
import { Input } from '@/components/ui/input';

interface LoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export function LoanPaymentModal({
  isOpen,
  onClose,
  loan,
}: LoanPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Please enter a valid repayment amount.');
      return;
    }

    setIsSubmitting(true);
    const res = await recordLoanPaymentAction({
      loanId: loan.id,
      amount: payAmount,
      paymentMethod,
      paidOn,
      note: note.trim() || null,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Repayment recorded!');
      setAmount('');
      setNote('');
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
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <ResponsiveDialogTitle>Record Repayment</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                For {loan.contact?.name || 'borrower'}
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          {/* Current Balance Box */}
          <div className="p-4 rounded-2xl bg-muted/60 mb-5">
            <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
              <span>Remaining Balance</span>
              <span>Total Loaned: {formatMoney(loan.amount)}</span>
            </div>
            <div className="text-2xl font-extrabold text-foreground">
              {formatMoney(loan.balance_remaining)}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Repayment Amount (PHP)
                </label>
                <button
                  type="button"
                  onClick={() => setAmount(loan.balance_remaining.toString())}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Pay in full ({formatMoney(loan.balance_remaining)})
                </button>
              </div>
              <MoneyInput
                max={loan.balance_remaining}
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(val) => setAmount(val)}
                className="w-full text-xl font-bold bg-muted/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                How did they pay?
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-10 w-full rounded-xl bg-muted/60 px-3 text-sm font-medium text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Payment Date
              </label>
              <Input
                type="date"
                required
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                className="w-full text-sm bg-muted/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Note (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Sent via GCash with ref #1234"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full text-sm bg-muted/60"
              />
            </div>

            <div className="pt-3 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Repayment'
                )}
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
