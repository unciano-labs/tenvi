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
import { CardColorPicker } from '@/components/Cards/CardColorPicker';

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
            <div className="size-10 rounded-xl bg-success-soft text-success flex items-center justify-center shrink-0">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <ResponsiveDialogTitle>Add savings or cash account</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Track traditional banks, digital banks, e-wallets, or physical cash
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-5">
          {/* Live Card Preview */}
          <div
            className={`@container w-full rounded-[22px] p-4 sm:p-5 text-white ${theme.bgColor} ${theme.glowShadow} relative overflow-hidden transition-colors duration-(--motion-base) ease-(--ease-in-out) shadow-card flex flex-col justify-between`}
            style={{ aspectRatio: '1.58 / 1', minHeight: '190px', backgroundColor: theme.bgHex || theme.accentHex }}
          >
            {/* Background Pattern Overlay */}
            <CardPatternOverlay pattern={pattern} accentHex={theme.accentHex} />

            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate font-bold text-xs sm:text-sm tracking-wider uppercase text-white/95">
                  {finalInstitutionName || 'INSTITUTION'}
                </h4>
                <p className="truncate text-sm text-white/80 font-medium">
                  {name || 'Account Nickname'}
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white capitalize">
                {accountType.replace('_', ' ')}
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-3 my-auto py-1">
              <div className="flex shrink-0 items-center gap-2">
                <EmvChip />
                <ContactlessWave />
              </div>

              <div className="min-w-0 text-right">
                <span className="text-xs font-medium text-white/75 block tracking-wider uppercase">
                  Current Stash
                </span>
                <span className="num block whitespace-nowrap text-[clamp(1.125rem,7cqi,1.375rem)] font-bold text-white tracking-tight">
                  ₱{parsedBalance.toLocaleString('en-PH')}
                </span>
              </div>
            </div>

            <div className="relative z-10 flex items-end justify-between gap-2 pt-1">
              <div className="min-w-0 truncate font-mono text-xs font-semibold tracking-[0.18em] text-white/80">
                {accountNumberLast4 ? `•••• •••• •••• ${accountNumberLast4}` : 'VAULT SAVINGS'}
              </div>

              {interestRate && parseFloat(interestRate) > 0 && (
                <span className="num shrink-0 text-[11px] font-semibold text-amber-100 bg-amber-400/25 px-2.5 py-1 rounded-full">
                  {interestRate}% p.a.
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Institution Picker */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                Where is the money kept?
              </label>
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-[background-color,box-shadow] duration-(--motion-fast) ease-(--ease-in-out) focus:ring-2 focus:ring-ring"
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
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">
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
            {/* Goal gets its own row; rate + last 4 share one, so labels never wrap and inputs stay aligned */}
            <div className="grid grid-cols-2 items-end gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">
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

            {/* Vault Color Picker with Presets + Custom Color */}
            <CardColorPicker
              currentColor={colorTheme}
              onChange={setColorTheme}
              label="Vault Color"
            />

            {/* Pattern Selector - 20 patterns */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Background Accent Pattern ({CARD_PATTERNS.length} options)
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                {CARD_PATTERNS.map((p) => {
                  const isSelected = pattern === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPattern(p.id)}
                      aria-pressed={isSelected}
                      className={`no-spring h-10 min-w-0 px-1 rounded-xl text-xs font-medium block truncate cursor-pointer transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                          : 'bg-muted/60 hover:bg-muted text-muted-foreground'
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
