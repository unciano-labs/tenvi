'use client';

import React, { useState } from 'react';
import { updateSavingsBalanceAction } from '@/app/actions/savings';
import { toast } from 'sonner';
import { ArrowDownRight, ArrowUpLeft, Loader2, RefreshCw } from 'lucide-react';
import { SavingsAccount } from '@/types';
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

interface SavingsBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: SavingsAccount | null;
}

export function SavingsBalanceModal({
  isOpen,
  onClose,
  account,
}: SavingsBalanceModalProps) {
  const [type, setType] = useState<'deposit' | 'withdraw' | 'set'>('deposit');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    const val = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    const res = await updateSavingsBalanceAction({
      id: account.id,
      amount: val,
      type,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        type === 'deposit'
          ? 'Deposit recorded!'
          : type === 'withdraw'
          ? 'Withdrawal recorded!'
          : 'Balance updated!'
      );
      setAmount('');
      onClose();
    }
  };

  return (
    <ResponsiveDialog
      open={isOpen && !!account}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader className="pr-10 sm:pr-12">
          <ResponsiveDialogTitle className="truncate">Adjust Balance</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="truncate">
            {account ? `${account.name} (${account.institution_name})` : ''}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          {account && (
            <div className="space-y-4">
              {/* Current Balance */}
              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs text-muted-foreground font-medium block mb-1">
                  Current Balance
                </span>
                <span className="text-2xl font-extrabold text-foreground">
                  {formatMoney(account.current_balance)}
                </span>
              </div>

              {/* Action Type Toggle */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted">
                <Button
                  type="button"
                  variant={type === 'deposit' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setType('deposit')}
                  className={`text-xs font-bold gap-1 rounded-xl ${
                    type === 'deposit' ? 'shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  + Deposit
                </Button>
                <Button
                  type="button"
                  variant={type === 'withdraw' ? 'destructive' : 'ghost'}
                  size="sm"
                  onClick={() => setType('withdraw')}
                  className={`text-xs font-bold gap-1 rounded-xl ${
                    type === 'withdraw' ? 'shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  <ArrowUpLeft className="w-3.5 h-3.5" />
                  - Withdraw
                </Button>
                <Button
                  type="button"
                  variant={type === 'set' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setType('set')}
                  className={`text-xs font-bold gap-1 rounded-xl ${
                    type === 'set' ? 'shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Set New
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {type === 'deposit'
                      ? 'Amount to Add (Deposit)'
                      : type === 'withdraw'
                      ? 'Amount to Deduct (Withdraw)'
                      : 'New Total Balance'}
                  </label>
                  <MoneyInput
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(val) => setAmount(val)}
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <Button
                    type="button"
                    variant="soft"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
