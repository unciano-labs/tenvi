'use client';

import React, { useState } from 'react';
import { createSavingsAccountAction } from '@/app/actions/savings';
import { toast } from 'sonner';
import { PiggyBank, Loader2, Sparkles, Building2, Check } from 'lucide-react';
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
import {
  CARD_ACCENTS,
  CARD_THEMES,
  CARD_PATTERNS,
  CardAccentId,
  CardPatternId,
  CardPatternOverlay,
  formatCardStyle,
  parseCardStyle,
  EmvChip,
  ContactlessWave,
} from '@/components/Cards/CardThemeTokens';

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
  const [pattern, setPattern] = useState<CardPatternId>('none');
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
    const packed = formatCardStyle(colorTheme as CardAccentId, 'visa', pattern);
    const res = await createSavingsAccountAction({
      name: name.trim() || finalInstitutionName,
      accountType,
      institutionName: finalInstitutionName,
      accountNumberLast4: accountNumberLast4 || null,
      currentBalance: currentBalance ? parseFloat(currentBalance) : 0,
      targetAmount: targetAmount ? parseFloat(targetAmount) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      colorTheme: packed,
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

  const { theme } = parseCardStyle(colorTheme, name);
  const parsedBalance = currentBalance ? parseFloat(currentBalance) : 0;

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

        <ResponsiveDialogBody className="space-y-5">
          {/* Live Card Preview */}
          <div
            className={`w-full rounded-[22px] p-4 sm:p-5 text-white border ${theme.borderColor} ${theme.bgColor} ${theme.glowShadow} relative overflow-hidden transition-all duration-300 shadow-card flex flex-col justify-between`}
            style={{ aspectRatio: '1.58 / 1', minHeight: '190px', backgroundColor: theme.bgHex || theme.accentHex }}
          >
            {/* Accent top highlight line */}
            <div className={`absolute top-0 inset-x-8 h-[2px] ${theme.barColor} opacity-70 z-10`} />

            {/* Background Pattern Overlay */}
            <CardPatternOverlay pattern={pattern} accentHex={theme.accentHex} />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <h4 className="font-black text-xs sm:text-sm tracking-wider uppercase text-white/95">
                  {finalInstitutionName || 'INSTITUTION'}
                </h4>
                <p className="text-[11px] text-white/70 font-medium">
                  {name || 'Account Nickname'}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 uppercase tracking-wider">
                {accountType.replace('_', ' ')}
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between my-auto py-1">
              <div className="flex items-center gap-2">
                <EmvChip />
                <ContactlessWave />
              </div>

              <div className="text-right">
                <span className="text-[10px] font-medium text-white/60 block tracking-wide uppercase">
                  Current Stash:
                </span>
                <span className="text-lg sm:text-xl font-black text-white tracking-tight">
                  ₱{parsedBalance.toLocaleString('en-PH')}
                </span>
              </div>
            </div>

            <div className="relative z-10 flex items-end justify-between pt-1">
              <div className="font-mono text-xs font-semibold tracking-widest text-white/80">
                {accountNumberLast4 ? `•••• •••• •••• ${accountNumberLast4}` : 'VAULT SAVINGS'}
              </div>

              {interestRate && parseFloat(interestRate) > 0 && (
                <span className="text-[10px] font-bold text-amber-200 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-300/30">
                  {interestRate}% p.a.
                </span>
              )}
            </div>
          </div>

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
                <option value="Other Bank / Account">Other Bank / Account</option>
              </select>
            </div>

            {/* Custom Institution Input */}
            {selectedInstitution === 'Other Bank / Account' && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Account / Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. GoTyme, Tonik, OwnBank"
                  value={customInstitution}
                  onChange={(e) => setCustomInstitution(e.target.value)}
                  className="min-h-12 h-12 text-sm"
                  required
                />
              </div>
            )}

            {/* Nickname and Current Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Account Nickname
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Emergency Fund, Daily Stash"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-h-12 h-12 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Current Balance
                </label>
                <MoneyInput
                  placeholder="0.00"
                  value={currentBalance}
                  onChange={setCurrentBalance}
                  className="min-h-12 h-12 text-sm"
                />
              </div>
            </div>

            {/* Target Amount & Interest Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Goal Target (Optional)
                </label>
                <MoneyInput
                  placeholder="e.g. 100,000"
                  value={targetAmount}
                  onChange={setTargetAmount}
                  className="min-h-12 h-12 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Interest Rate % p.a.
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 4.5"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="min-h-12 h-12 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Last 4 Digits
                </label>
                <Input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 8821"
                  value={accountNumberLast4}
                  onChange={(e) => setAccountNumberLast4(e.target.value.replace(/\D/g, ''))}
                  className="min-h-12 h-12 text-sm font-mono tracking-wider text-center"
                />
              </div>
            </div>

            {/* Accent Picker - 20 colors, scrollable, pure clickable circles without text */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vault Color
                </label>
                <span className="text-3xs text-muted-foreground font-medium">Scroll for more &rarr;</span>
              </div>
              <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin scroll-smooth">
                {Object.values(CARD_ACCENTS).map((acc) => {
                  const isSelected = colorTheme === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setColorTheme(acc.id)}
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

            {/* Pattern Selector - 10 patterns */}
            <div className="pt-2 border-t border-border/40">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Background Accent Pattern (10 options)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {CARD_PATTERNS.map((p) => {
                  const isSelected = pattern === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPattern(p.id)}
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

            <div className="pt-3 flex gap-3">
              <Button
                type="button"
                variant="soft"
                onClick={onClose}
                className="flex-1 min-h-12 h-12 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 min-h-12 h-12 font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Add Savings Account'
                )}
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
