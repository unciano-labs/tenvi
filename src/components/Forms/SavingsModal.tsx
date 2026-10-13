'use client';

import React, { useState } from 'react';
import { createSavingsAccountAction } from '@/app/actions/savings';
import { toast } from 'sonner';
import { PiggyBank, Loader2, Sparkles, Building2 } from 'lucide-react';
import { PH_SAVINGS_INSTITUTIONS } from '@/lib/constants';
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

interface SavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavingsModal({ isOpen, onClose }: SavingsModalProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<string>(
    PH_SAVINGS_INSTITUTIONS[0]?.name || ''
  );
  const [customInstitution, setCustomInstitution] = useState('');
  const [name, setName] = useState('');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [colorTheme, setColorTheme] = useState('emerald');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine institution object
  const matchedInst = PH_SAVINGS_INSTITUTIONS.find(
    (i) => i.name === selectedInstitution
  );
  const accountType = matchedInst ? matchedInst.type : 'traditional_bank';
  const finalInstitutionName =
    selectedInstitution === 'Other Bank / Account'
      ? customInstitution.trim()
      : selectedInstitution;

  // Group institutions by category
  const groups = Array.from(
    new Set(PH_SAVINGS_INSTITUTIONS.map((i) => i.group))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalInstitutionName) {
      toast.error('Please select or specify the account or bank.');
      return;
    }

    setIsSubmitting(true);
    const res = await createSavingsAccountAction({
      name: name.trim() || finalInstitutionName,
      accountType,
      institutionName: finalInstitutionName,
      accountNumberLast4: accountNumberLast4 || null,
      currentBalance: currentBalance ? parseFloat(currentBalance) : 0,
      targetAmount: targetAmount ? parseFloat(targetAmount) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      colorTheme,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Savings account / cash wallet added!');
      setName('');
      setCurrentBalance('');
      setTargetAmount('');
      setInterestRate('');
      setAccountNumberLast4('');
      onClose();
    }
  };

  const colors = [
    { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-900' },
    { id: 'indigo', name: 'Navy', bg: 'bg-indigo-900' },
    { id: 'blue', name: 'Ocean', bg: 'bg-blue-900' },
    { id: 'amber', name: 'Bronze', bg: 'bg-amber-900' },
    { id: 'slate', name: 'Charcoal', bg: 'bg-slate-900' },
  ];

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader className="pr-10 sm:pr-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <ResponsiveDialogTitle className="truncate">Add Savings or Cash Account</ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="truncate">
                Track traditional banks, digital banks, e-wallets, or physical cash
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Institution Picker */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Where is the money kept?
              </label>
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
              >
                {groups.map((group) => (
                  <optgroup key={group} label={group}>
                    {PH_SAVINGS_INSTITUTIONS.filter((i) => i.group === group).map(
                      (inst) => (
                        <option key={inst.name} value={inst.name}>
                          {inst.name}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </select>

              {selectedInstitution === 'Other Bank / Account' && (
                <Input
                  type="text"
                  required
                  placeholder="Type custom bank or account name..."
                  value={customInstitution}
                  onChange={(e) => setCustomInstitution(e.target.value)}
                  className="mt-2 text-sm"
                  autoFocus
                />
              )}
            </div>

            {/* Account Nickname */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Account / Goal Nickname
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Emergency Fund, Japan Trip Stash, Payroll"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Balance */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Current Balance (PHP)
                </label>
                <MoneyInput
                  required
                  placeholder="0.00"
                  value={currentBalance}
                  onChange={(val) => setCurrentBalance(val)}
                />
              </div>

              {/* Target Goal Amount (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Target Goal (Optional)
                </label>
                <MoneyInput
                  placeholder="e.g. 50,000.00"
                  value={targetAmount}
                  onChange={(val) => setTargetAmount(val)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Interest Rate */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Interest Rate p.a. % (Optional)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 4.5, 6.0"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="pr-8 text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </div>

              {/* Account last 4 digits */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Last 4 Digits (Optional)
                </label>
                <Input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 8821"
                  value={accountNumberLast4}
                  onChange={(e) => setAccountNumberLast4(e.target.value.replace(/\D/g, ''))}
                  className="text-sm font-mono tracking-wider text-center"
                />
              </div>
            </div>

            {/* Color theme */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Card Color
              </label>
              <div className="flex items-center gap-3">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColorTheme(c.id)}
                    className={`size-9 rounded-2xl ${c.bg} flex items-center justify-center transition-transform cursor-pointer ${
                      colorTheme === c.id
                        ? 'scale-110 shadow-md ring-2 ring-primary ring-offset-2'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="pt-3 flex gap-3">
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
                    Saving...
                  </>
                ) : (
                  'Add Savings'
                )}
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
