'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CreditCard } from '@/types';
import {
  formatMoney,
  calculateNextDueDate,
  getCardUrgency,
  type CardSpendingSummary,
} from '@/lib/finance/calculations';
import {
  parseCardStyle,
  formatCardStyle,
  CARD_ACCENTS,
  CARD_PATTERNS,
  CardAccentId,
  CardNetwork,
  CardPatternId,
  CardPatternOverlay,
  EmvChip,
  ContactlessWave,
  VisaLogo,
  MastercardLogo,
} from './CardThemeTokens';
import { updateCreditCardAction } from '@/app/actions/cards';
import { toast } from 'sonner';
import {
  RotateCcw,
  Pencil,
  Trash2,
  Palette,
  ExternalLink,
  MoreVertical,
  Check,
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

export type { CardSpendingSummary };

interface FlippableCreditCardProps {
  card: CreditCard;
  spending: CardSpendingSummary;
  onEdit: (card: CreditCard) => void;
  onDelete: (cardId: string) => void;
}

function getOrdinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

export function FlippableCreditCard({
  card,
  spending,
  onEdit,
  onDelete,
}: FlippableCreditCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isThemePopoverOpen, setIsThemePopoverOpen] = useState(false);

  // Parse solid accent, network, and pattern
  const { theme, themeId, network, pattern } = parseCardStyle(card.color_theme, card.name);

  const creditLimit = Number(card.credit_limit || 0);
  const totalUsed = spending.totalUsed || 0;
  const loansBoughtForOthers = spending.loansSpend || 0;
  const availableToSpend =
    spending.availableToSpend !== undefined
      ? spending.availableToSpend
      : Math.max(0, creditLimit - totalUsed);

  const usagePct = creditLimit > 0 ? Math.min(100, Math.round((totalUsed / creditLimit) * 100)) : 0;
  const dueDateInfo = calculateNextDueDate(card.due_day);
  const billedBalance = card.latest_statement
    ? Number(card.latest_statement.billed_amount || 0) - Number(card.latest_statement.paid_amount || 0)
    : totalUsed;
  const urgencyInfo = getCardUrgency(dueDateInfo.nextDueDate, billedBalance);

  // Card click handler: flips ONLY when clicking card surface, never when clicking buttons or controls
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

  // Change solid accent
  const handleChangeAccent = async (newAccentId: CardAccentId) => {
    const packed = formatCardStyle(newAccentId, network, pattern);
    const res = await updateCreditCardAction(card.id, {
      name: card.name,
      bankName: card.bank_name,
      last4: card.last_4,
      creditLimit: card.credit_limit,
      statementDay: card.statement_day,
      dueDay: card.due_day,
      colorTheme: packed,
    });
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Card accent updated!');
    }
  };

  // Change background pattern
  const handleChangePattern = async (newPatternId: CardPatternId) => {
    const packed = formatCardStyle(themeId, network, newPatternId);
    const res = await updateCreditCardAction(card.id, {
      name: card.name,
      bankName: card.bank_name,
      last4: card.last_4,
      creditLimit: card.credit_limit,
      statementDay: card.statement_day,
      dueDay: card.due_day,
      colorTheme: packed,
    });
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Card pattern updated!');
    }
  };

  // Toggle network
  const handleToggleNetwork = async (newNetwork: CardNetwork) => {
    const packed = formatCardStyle(themeId, newNetwork, pattern);
    const res = await updateCreditCardAction(card.id, {
      name: card.name,
      bankName: card.bank_name,
      last4: card.last_4,
      creditLimit: card.credit_limit,
      statementDay: card.statement_day,
      dueDay: card.due_day,
      colorTheme: packed,
    });
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Network set to ${newNetwork === 'visa' ? 'Visa' : 'Mastercard'}!`);
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
        aria-label={`${card.bank_name} ${card.name}. Click to flip card.`}
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
            className={`absolute inset-0 size-full rounded-[22px] p-4 sm:p-5 text-white flex flex-col justify-between border ${theme.borderColor} ${theme.hoverBorderColor} ${theme.bgColor} ${theme.glowShadow} bg-slate-900 backface-hidden [backface-visibility:hidden] ${
              isFlipped ? 'opacity-0 pointer-events-none invisible' : 'opacity-100 pointer-events-auto visible'
            }`}
            style={{
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

            {/* Front Top: Bank Name & Card Name */}
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium uppercase tracking-wider text-white/80 block">
                  {card.bank_name}
                </span>
                <h3 className="text-base font-semibold leading-snug text-white whitespace-normal break-words">
                  {card.name}
                </h3>
              </div>

              {/* Accent & Network Customizer (Stops propagation so it never flips card) */}
              <div data-no-flip="true">
                <Popover open={isThemePopoverOpen} onOpenChange={setIsThemePopoverOpen}>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        className="size-7.5 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs border border-white/20"
                        title="Customize card color, pattern & network"
                        aria-label="Customize card color, pattern & network"
                      />
                    }
                  >
                    <Palette className="size-4" />
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="end"
                    className="w-72 sm:w-80 p-3.5 rounded-2xl bg-popover text-popover-foreground shadow-lift border border-border/70 space-y-3 z-50"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
                          Card Color
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

                    <div className="pt-2 border-t border-border/50">
                      <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Network
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleNetwork('visa')}
                          className={`h-8 rounded-lg border flex items-center justify-center p-1 cursor-pointer transition-all ${
                            network === 'visa'
                              ? 'bg-primary/10 border-primary text-primary font-bold'
                              : 'bg-muted/40 border-border/60 hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <span className="font-black italic text-xs">VISA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleNetwork('mastercard')}
                          className={`h-8 rounded-lg border flex items-center justify-center gap-1.5 p-1 cursor-pointer transition-all ${
                            network === 'mastercard'
                              ? 'bg-primary/10 border-primary font-bold'
                              : 'bg-muted/40 border-border/60 hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="size-3 rounded-full bg-[#EB001B]" />
                            <div className="size-3 rounded-full bg-[#F79E1B] -ml-1.5 opacity-90" />
                          </div>
                          <span className="text-3xs font-bold text-foreground">MC</span>
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Front Middle: Chip + Available Spending */}
            <div className="relative z-10 flex items-center justify-between my-auto py-1">
              <div className="flex items-center gap-2">
                <EmvChip />
                <ContactlessWave />
              </div>

              <div className="text-right">
                <span className="text-xs font-medium uppercase tracking-wider text-white/70 block">
                  Available Spending
                </span>
                <span className="text-2xl font-bold tracking-tight text-white leading-tight">
                  {formatMoney(availableToSpend)}
                </span>
              </div>
            </div>

            {/* Front Bottom: Dots + Network */}
            <div className="relative z-10 flex items-end justify-between pt-1">
              <div className="font-mono text-xs sm:text-sm font-semibold tracking-widest text-white/80">
                •••• •••• •••• {card.last_4}
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

          {/* ================= CARD BACK (Details Solid) ================= */}
          <div
            className={`absolute inset-0 size-full rounded-[22px] p-4 sm:p-5 text-white flex flex-col justify-between border ${theme.borderColor} ${theme.hoverBorderColor} ${theme.bgColor} ${theme.glowShadow} bg-slate-900 backface-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] ${
              isFlipped ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'
            }`}
            style={{
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

            {/* Back Top: Bank & Nickname + Action Buttons */}
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium uppercase tracking-wider text-white/80 block">
                  {card.bank_name}
                </span>
                <h3 className="text-base font-semibold leading-snug text-white whitespace-normal break-words">
                  {card.name}
                </h3>
              </div>

              {/* Action Buttons: Edit, Delete, View Hub */}
              <div className="flex items-center gap-1 shrink-0" data-no-flip="true">
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="size-6 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                  title="View statement cycle hub"
                  aria-label="View card hub"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="size-3" />
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="size-6 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Card actions menu"
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
                        setIsFlipped(false);
                        setIsThemePopoverOpen(true);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2 hover:bg-muted rounded-lg"
                    >
                      <Palette className="size-3 text-muted-foreground" />
                      <span>Card Theme</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(card);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold cursor-pointer flex items-center gap-2 hover:bg-muted rounded-lg"
                    >
                      <Pencil className="size-3 text-muted-foreground" />
                      <span>Edit Card</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(card.id);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-lighterror cursor-pointer flex items-center gap-2 rounded-lg"
                    >
                      <Trash2 className="size-3" />
                      <span>Delete Card</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Back Middle: Available Spending + Urgency Badge */}
            <div className="relative z-10 space-y-1.5 my-auto py-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-white/70 block">
                    Available Spending
                  </span>
                  <div className="text-2xl font-bold tracking-tight text-white leading-tight">
                    {formatMoney(availableToSpend)}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                    urgencyInfo.urgency === 'urgent' || urgencyInfo.urgency === 'overdue'
                      ? 'bg-rose-500/25 text-rose-200 border-rose-400/40'
                      : urgencyInfo.urgency === 'soon'
                      ? 'bg-amber-500/25 text-amber-200 border-amber-400/40'
                      : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                  }`}
                >
                  {urgencyInfo.urgency === 'overdue'
                    ? 'Overdue'
                    : dueDateInfo.daysRemaining <= 0
                    ? 'Due Today'
                    : `Due in ${dueDateInfo.daysRemaining} days`}
                </span>
              </div>

              {/* Solid Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${theme.barColor} transition-all duration-500`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-white/70 font-medium">
                  <span>{usagePct}% used</span>
                  <span>
                    {formatMoney(totalUsed)} of {formatMoney(creditLimit)}
                  </span>
                </div>
              </div>

              {/* Shared Loans Pill */}
              {loansBoughtForOthers > 0 && (
                <div className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 text-[9px] font-medium border border-white/15">
                  <span>includes {formatMoney(loansBoughtForOthers)} for others</span>
                </div>
              )}
            </div>

            {/* Back Bottom: Schedule Details (Smaller text, fits comfortably) */}
            <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-2xs">
              <div>
                <span className="text-white/50 block text-[9px] uppercase">Bill made:</span>
                <span className="font-bold text-white text-[11px]">
                  {getOrdinalSuffix(card.statement_day)} of month
                </span>
              </div>

              <div className="text-right">
                <span className="text-white/50 block text-[9px] uppercase">Pay by:</span>
                <span className="font-bold text-white text-[11px]">
                  {getOrdinalSuffix(card.due_day)} of month
                </span>
              </div>
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
