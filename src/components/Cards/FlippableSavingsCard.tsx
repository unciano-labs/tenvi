'use client';

import React, { useState, useEffect } from 'react';
import { SavingsAccount } from '@/types';
import { formatMoney } from '@/lib/finance/calculations';
import {
  parseCardStyle,
  formatCardStyle,
  CARD_ACCENTS,
  CARD_PATTERNS,
  CardAccentId,
  CardPatternId,
  CardPatternOverlay,
  EmvChip,
  ContactlessWave,
} from './CardThemeTokens';
import { updateSavingsThemeAction } from '@/app/actions/savings';
import { toast } from 'sonner';
import {
  RotateCcw,
  Trash2,
  Palette,
  MoreVertical,
  Check,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface FlippableSavingsCardProps {
  account: SavingsAccount;
  transactions?: any[];
  onOpenBalanceModal: (account: SavingsAccount) => void;
  onDelete: (id: string) => void;
}

export function FlippableSavingsCard({
  account,
  transactions = [],
  onOpenBalanceModal,
  onDelete,
}: FlippableSavingsCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isThemePopoverOpen, setIsThemePopoverOpen] = useState(false);

  // Per-card color state initialized from account.color or account.color_theme
  const initialStyle = (account as any).color || account.color_theme || 'emerald';
  const [localStyle, setLocalStyle] = useState<string>(initialStyle);

  useEffect(() => {
    const current = (account as any).color || account.color_theme || 'emerald';
    setLocalStyle(current);
  }, [(account as any).color, account.color_theme]);

  // Parse solid accent and pattern from localStyle
  const { theme, themeId, pattern } = parseCardStyle(localStyle, account.name);

  const balance = Number(account.current_balance || 0);
  const target = Number(account.target_amount || 0);
  const progress = target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : null;

  const connectedTxs = (transactions || []).filter(
    (t) => t.savings_id === account.id || t.transfer_to_savings_id === account.id
  );

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const interactive = target.closest(
      'button, a, input, select, [role="menuitem"], [data-no-flip="true"]'
    );
    if (interactive && interactive !== e.currentTarget) {
      return;
    }
    setIsFlipped((prev) => !prev);
  };

  const handleChangeAccent = async (newAccentId: CardAccentId) => {
    const packed = formatCardStyle(newAccentId, 'visa', pattern);
    const prev = localStyle;
    setLocalStyle(packed);
    const res = await updateSavingsThemeAction(account.id, packed);
    if (res?.error) {
      setLocalStyle(prev);
      toast.error(res.error);
    } else {
      toast.success('Account accent updated!');
    }
  };

  const handleChangePattern = async (newPatternId: CardPatternId) => {
    const packed = formatCardStyle(themeId, 'visa', newPatternId);
    const prev = localStyle;
    setLocalStyle(packed);
    const res = await updateSavingsThemeAction(account.id, packed);
    if (res?.error) {
      setLocalStyle(prev);
      toast.error(res.error);
    } else {
      toast.success('Account pattern updated!');
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'digital_bank':
        return 'Digital Bank';
      case 'traditional_bank':
        return 'Traditional Bank';
      case 'ewallet':
        return 'E-Wallet';
      case 'cash':
        return 'Cash Envelope';
      default:
        return 'Savings Vault';
    }
  };

  return (
    <div className="flex flex-col items-center group/card w-full max-w-sm mx-auto transition-transform duration-300 ease-out hover:-translate-y-1.5">
      {/* 3D Perspective Card Container with Hover Effects */}
      <div
        className="w-full relative perspective-1200 [perspective:1200px] select-none cursor-pointer"
        style={{
          aspectRatio: '1.58 / 1',
          minHeight: '215px',
          WebkitPerspective: '1200px',
          perspective: '1200px',
        }}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped((prev) => !prev);
          }
        }}
        aria-label={`${account.institution_name} ${account.name}. Click to flip card.`}
      >
        <div
          className={`size-full relative transition-transform duration-500 ease-in-out preserve-3d [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
          style={{
            WebkitTransformStyle: 'preserve-3d',
            transformStyle: 'preserve-3d',
            WebkitTransform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ================= CARD FRONT (Minimal Solid) ================= */}
          <div
            className={`absolute inset-0 size-full rounded-[22px] p-4 sm:p-5 text-white flex flex-col justify-between border ${theme.borderColor} ${theme.hoverBorderColor} ${theme.bgColor} ${theme.glowShadow} backface-hidden [backface-visibility:hidden] ${
              isFlipped ? 'opacity-0 pointer-events-none invisible' : 'opacity-100 pointer-events-auto visible'
            }`}
            style={{
              backgroundColor: theme.bgHex || theme.accentHex,
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              WebkitTransform: 'rotateY(0deg) translateZ(1px)',
              transform: 'rotateY(0deg) translateZ(1px)',
              zIndex: isFlipped ? 1 : 2,
              opacity: isFlipped ? 0 : 1,
              visibility: isFlipped ? 'hidden' : 'visible',
              transition: 'transform 500ms ease-in-out, opacity 350ms ease-in-out, visibility 350ms',
            }}
          >
            {/* Subtle solid accent top highlight line */}
            <div className={`absolute top-0 inset-x-8 h-[2px] ${theme.barColor} opacity-70 z-10`} />

            {/* Background Pattern Overlay */}
            <CardPatternOverlay pattern={pattern} accentHex={theme.accentHex} />

            {/* Front Top: Institution & Nickname */}
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium uppercase tracking-wider text-white/80 block">
                  {account.institution_name}
                </span>
                <h3 className="text-base font-semibold leading-snug text-white whitespace-normal break-words">
                  {account.name}
                </h3>
              </div>

              {/* Accent & Pattern Picker Trigger */}
              <div data-no-flip="true">
                <Popover open={isThemePopoverOpen} onOpenChange={setIsThemePopoverOpen}>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="size-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Change card accent and pattern"
                        aria-label="Change card accent and pattern"
                      />
                    }
                  >
                    <Palette className="size-3.5" />
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="end"
                    className="w-72 sm:w-80 p-3.5 rounded-2xl bg-popover text-popover-foreground shadow-lift border border-border/70 space-y-3 z-50"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
                          Vault Color
                        </span>
                        <span className="text-3xs text-muted-foreground font-medium">Scroll for more &rarr;</span>
                      </div>
                      {/* 20 colors, 2 rows, horizontally scrollable with scrollbar, pure clickable circles with no text labels */}
                      <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin scroll-smooth">
                        {Object.values(CARD_ACCENTS).map((acc) => {
                          const isSelected = themeId === acc.id;
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => handleChangeAccent(acc.id)}
                              className={`size-7 sm:size-8 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-xs shrink-0 ${
                                isSelected
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110 shadow-md'
                                  : 'hover:opacity-90'
                              }`}
                              style={{ backgroundColor: acc.accentHex }}
                              title={acc.name}
                              aria-label={acc.name}
                            >
                              {isSelected && <Check className="size-3.5 text-white drop-shadow stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pattern Selector (10 patterns) */}
                    <div className="pt-2 border-t border-border/50">
                      <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Background Pattern (10 options)
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        {CARD_PATTERNS.map((p) => {
                          const isSelected = pattern === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleChangePattern(p.id)}
                              className={`h-7 px-1 rounded-lg border text-3xs font-semibold flex items-center justify-center cursor-pointer transition-all truncate ${
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
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Front Middle: Chip + Balance */}
            <div className="relative z-10 flex items-center justify-between my-auto py-1">
              <div className="flex items-center gap-2">
                <EmvChip />
                <ContactlessWave />
              </div>

              <div className="text-right">
                <span className="text-xs font-medium uppercase tracking-wider text-white/70 block">
                  Current Stash
                </span>
                <span className="text-2xl font-bold tracking-tight text-white leading-tight">
                  {formatMoney(balance)}
                </span>
              </div>
            </div>

            {/* Front Bottom: Identifier / Dots + Type Badge */}
            <div className="relative z-10 flex items-end justify-between pt-1">
              <div className="font-mono text-xs sm:text-sm font-semibold tracking-widest text-white/80">
                {account.account_number_last4
                  ? `•••• •••• •••• ${account.account_number_last4}`
                  : 'VAULT SAVINGS'}
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 uppercase tracking-wider">
                {getAccountTypeLabel(account.account_type)}
              </span>
            </div>
          </div>

          {/* ================= CARD BACK (Details Solid) ================= */}
          <div
            className={`absolute inset-0 size-full rounded-[22px] p-4 sm:p-5 text-white flex flex-col justify-between border ${theme.borderColor} ${theme.hoverBorderColor} ${theme.bgColor} ${theme.glowShadow} backface-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] ${
              isFlipped ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
            }`}
            style={{
              backgroundColor: theme.bgHex || theme.accentHex,
              WebkitBackfaceVisibility: 'hidden',
              backfaceVisibility: 'hidden',
              WebkitTransform: 'rotateY(180deg) translateZ(1px)',
              transform: 'rotateY(180deg) translateZ(1px)',
              zIndex: isFlipped ? 2 : 1,
              opacity: isFlipped ? 1 : 0,
              visibility: isFlipped ? 'visible' : 'hidden',
              transition: 'transform 500ms ease-in-out, opacity 350ms ease-in-out, visibility 350ms',
            }}
          >
            {/* Subtle solid accent top highlight line */}
            <div className={`absolute top-0 inset-x-8 h-[2px] ${theme.barColor} opacity-70 z-10`} />

            {/* Background Pattern Overlay */}
            <CardPatternOverlay pattern={pattern} accentHex={theme.accentHex} />

            {/* Back Top: Institution & Nickname + Action Menu */}
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium uppercase tracking-wider text-white/80 block">
                  {account.institution_name}
                </span>
                <h3 className="text-base font-semibold leading-snug text-white whitespace-normal break-words">
                  {account.name}
                </h3>
              </div>

              <div className="flex items-center gap-1 shrink-0" data-no-flip="true">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="size-6 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Account actions menu"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                    <MoreVertical className="size-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-40 p-1 rounded-xl shadow-lift bg-popover text-popover-foreground border border-border/70 z-50 text-xs"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBalanceModal(account);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2 hover:bg-muted rounded-lg"
                    >
                      <ArrowUpDown className="size-3 text-muted-foreground" />
                      <span>Adjust Balance</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(account.id);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-lighterror cursor-pointer flex items-center gap-2 rounded-lg"
                    >
                      <Trash2 className="size-3" />
                      <span>Remove Account</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Back Middle: Balance + Goal Progress or Interest */}
            <div className="relative z-10 space-y-1.5 my-auto py-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-white/70 block">
                    Stash Balance
                  </span>
                  <div className="text-2xl font-bold tracking-tight text-white leading-tight">
                    {formatMoney(balance)}
                  </div>
                </div>

                {account.interest_rate && account.interest_rate > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30 flex items-center gap-1 shrink-0">
                    <Sparkles className="size-2.5" />
                    {account.interest_rate}% p.a.
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15 shrink-0">
                    {getAccountTypeLabel(account.account_type)}
                  </span>
                )}
              </div>

              {/* Goal Progress Bar */}
              {target > 0 && progress !== null ? (
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${theme.barColor} transition-all duration-500`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-white/70 font-medium">
                    <span>Goal: {formatMoney(target)}</span>
                    <span>{progress}% reached</span>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-white/60">
                  <span>{connectedTxs.length} transaction records connected</span>
                </div>
              )}
            </div>

            {/* Back Bottom: Quick Update Balance Action */}
            <div
              className="relative z-10 pt-2 border-t border-white/15 flex items-center"
              data-no-flip="true"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBalanceModal(account);
                }}
                className="w-full h-7 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/20 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <ArrowUpDown className="size-3" />
                <span>Adjust / Record Balance</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tap to Flip Guide Indicator with Hover Animation */}
      <button
        type="button"
        onClick={() => setIsFlipped((prev) => !prev)}
        className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-muted/60"
      >
        <RotateCcw className="size-3.5 transition-transform duration-300 group-hover/card:rotate-180" />
        <span>{isFlipped ? 'Tap to view front' : 'Tap to flip'}</span>
      </button>
    </div>
  );
}
