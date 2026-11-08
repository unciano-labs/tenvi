'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CreditCard } from '@/types';
import {
  formatMoney,
  calculateNextDueDate,
  getCardUrgency,
  type CardSpendingSummary,
  type CardDueDetails,
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
  CardNetworkLogo,
} from './CardThemeTokens';
import { CardColorPicker } from './CardColorPicker';
import { updateCreditCardAction, updateCreditCardThemeAction } from '@/app/actions/cards';
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
  dueDetails?: CardDueDetails;
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
  dueDetails,
  onEdit,
  onDelete,
}: FlippableCreditCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isThemePopoverOpen, setIsThemePopoverOpen] = useState(false);

  // Per-card color state initialized from card.color or card.color_theme
  const initialStyle = (card as any).color || card.color_theme || 'cyan';
  const [localStyle, setLocalStyle] = useState<string>(initialStyle);

  useEffect(() => {
    const current = (card as any).color || card.color_theme || 'cyan';
    setLocalStyle(current);
  }, [(card as any).color, card.color_theme]);

  // Parse solid accent, network, and pattern from localStyle
  const { theme, themeId, network, pattern } = parseCardStyle(localStyle, card.name);

  const creditLimit = Number(card.credit_limit || 0);
  const totalUsed = spending.totalUsed || 0;
  const loansBoughtForOthers = spending.loansSpend || 0;
  const availableToSpend =
    spending.availableToSpend !== undefined
      ? spending.availableToSpend
      : Math.max(0, creditLimit - totalUsed);

  const usagePct = creditLimit > 0 ? Math.min(100, Math.round((totalUsed / creditLimit) * 100)) : 0;
  const dueDateInfo = calculateNextDueDate(card.due_day);
  const billedBalance = dueDetails
    ? dueDetails.amountDue
    : card.latest_statement
    ? Number(card.latest_statement.billed_amount || 0) - Number(card.latest_statement.paid_amount || 0)
    : 0;

  const effectiveDaysRemaining = dueDetails ? dueDetails.daysRemaining : dueDateInfo.daysRemaining;
  const isOverdue = dueDetails ? dueDetails.urgency === 'overdue' : (billedBalance > 0 && effectiveDaysRemaining < 0);

  let dueBadgeLabel = 'No balance due';
  let dueBadgeStyle = 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30';

  if (billedBalance > 0) {
    if (isOverdue) {
      dueBadgeLabel = 'Overdue';
      dueBadgeStyle = 'bg-rose-500/25 text-rose-200 border-rose-400/40';
    } else if (effectiveDaysRemaining === 0) {
      dueBadgeLabel = 'Due Today';
      dueBadgeStyle = 'bg-rose-500/25 text-rose-200 border-rose-400/40';
    } else if (effectiveDaysRemaining === 1) {
      dueBadgeLabel = 'Due Tomorrow';
      dueBadgeStyle = 'bg-rose-500/25 text-rose-200 border-rose-400/40';
    } else if (effectiveDaysRemaining <= 3) {
      dueBadgeLabel = `Due in ${effectiveDaysRemaining} days`;
      dueBadgeStyle = 'bg-rose-500/25 text-rose-200 border-rose-400/40';
    } else if (effectiveDaysRemaining <= 7) {
      dueBadgeLabel = `Due in ${effectiveDaysRemaining} days`;
      dueBadgeStyle = 'bg-amber-500/25 text-amber-200 border-amber-400/40';
    } else {
      dueBadgeLabel = `Due in ${effectiveDaysRemaining} days`;
      dueBadgeStyle = 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30';
    }
  }

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

  // Change solid accent or custom hex for this specific card
  const handleChangeAccent = async (newAccent: string) => {
    const packed = formatCardStyle(newAccent, network, pattern);
    const prev = localStyle;
    setLocalStyle(packed);
    const res = await updateCreditCardThemeAction(card.id, packed);
    if (res?.error) {
      setLocalStyle(prev);
      toast.error(res.error);
    } else {
      toast.success('Card accent updated!');
    }
  };

  // Change background pattern for this specific card
  const handleChangePattern = async (newPatternId: CardPatternId) => {
    const packed = formatCardStyle(themeId, network, newPatternId);
    const prev = localStyle;
    setLocalStyle(packed);
    const res = await updateCreditCardThemeAction(card.id, packed);
    if (res?.error) {
      setLocalStyle(prev);
      toast.error(res.error);
    } else {
      toast.success('Card pattern updated!');
    }
  };

  // Toggle network for this specific card
  const handleToggleNetwork = async (newNetwork: CardNetwork) => {
    const packed = formatCardStyle(themeId, newNetwork, pattern);
    const prev = localStyle;
    setLocalStyle(packed);
    const res = await updateCreditCardThemeAction(card.id, packed);
    if (res?.error) {
      setLocalStyle(prev);
      toast.error(res.error);
    } else {
      const networkLabels: Record<CardNetwork, string> = {
        visa: 'Visa',
        mastercard: 'Mastercard',
        jcb: 'JCB',
        unionpay: 'UnionPay',
        amex: 'American Express',
      };
      toast.success(`Network set to ${networkLabels[newNetwork] || newNetwork}!`);
    }
  };

  return (
    <div className="flex flex-col items-center group/card w-full max-w-sm mx-auto transition-transform duration-(--motion-base) ease-(--ease-spring-soft) hover:-translate-y-1">
      {/* 3D Perspective Card Container with Hover Effects */}
      <div
        className="w-full relative perspective-1200 [perspective:1200px] select-none cursor-pointer rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          className={`size-full relative transition-transform duration-(--motion-settle) ease-(--ease-spring-soft) preserve-3d [transform-style:preserve-3d] ${
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
            className={`absolute inset-0 size-full rounded-[22px] p-4 sm:p-5 text-white flex flex-col justify-between ${theme.bgColor} ${theme.glowShadow} backface-hidden [backface-visibility:hidden] ${
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
              transition: 'opacity var(--motion-base) var(--ease-in-out), visibility var(--motion-base)',
            }}
          >

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
                        className="no-spring size-9 -m-1 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white"
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
                    className="w-72 sm:w-80 p-4 rounded-2xl bg-popover text-popover-foreground shadow-lift gap-4 z-50"
                  >
                    <CardColorPicker
                      compact
                      currentColor={themeId || localStyle.split(':')[0]}
                      onChange={(c) => handleChangeAccent(c)}
                      label="Card Color"
                    />

                    {/* Pattern Selector (20 patterns) */}
                    <div>
                      <span className="text-label text-muted-foreground block mb-2">
                        Background pattern <span className="num">({CARD_PATTERNS.length})</span>
                      </span>
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                        {CARD_PATTERNS.map((p) => {
                          const isSelected = pattern === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleChangePattern(p.id)}
                              aria-pressed={isSelected}
                              className={`no-spring h-8 px-1 rounded-lg text-2xs font-semibold flex items-center justify-center cursor-pointer transition-colors duration-(--motion-fast) ease-(--ease-in-out) truncate outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? 'bg-primary/10 text-primary ring-2 ring-primary ring-inset'
                                  : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                              }`}
                              title={p.name}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Card Network Selector (5 networks) */}
                    <div>
                      <span className="text-label text-muted-foreground block mb-2">
                        Network
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        {(['visa', 'mastercard', 'jcb', 'unionpay', 'amex'] as const).map((net) => {
                          const isSelected = network === net;
                          return (
                            <button
                              key={net}
                              type="button"
                              onClick={() => handleToggleNetwork(net)}
                              aria-pressed={isSelected}
                              className={`no-spring h-9 rounded-lg flex items-center justify-center p-1 cursor-pointer transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isSelected
                                  ? 'bg-primary/10 ring-2 ring-primary ring-inset'
                                  : 'bg-muted/50 hover:bg-muted'
                              }`}
                              title={net.toUpperCase()}
                              aria-label={net.toUpperCase()}
                            >
                              <CardNetworkLogo network={net} className="h-4 max-w-full" />
                            </button>
                          );
                        })}
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
                <span className="num text-2xl font-bold tracking-tight text-white leading-tight">
                  {formatMoney(availableToSpend)}
                </span>
              </div>
            </div>

            {/* Front Bottom: Dots + Network */}
            <div className="relative z-10 flex items-end justify-between pt-1">
              <div className="num font-mono text-xs sm:text-sm font-semibold tracking-widest text-white/80">
                •••• •••• •••• {card.last_4}
              </div>

              <div className="flex items-center">
                <CardNetworkLogo network={network} className="h-5" />
              </div>
            </div>
          </div>

          {/* ================= CARD BACK (Details Solid) ================= */}
          <div
            className={`absolute inset-0 size-full rounded-[22px] p-4 sm:p-5 text-white flex flex-col justify-between ${theme.bgColor} ${theme.glowShadow} backface-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] ${
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
              transition: 'opacity var(--motion-base) var(--ease-in-out), visibility var(--motion-base)',
            }}
          >

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
              <div className="-m-1 flex items-center gap-1 shrink-0" data-no-flip="true">
                <Link
                  href={`/dashboard/cards/${card.id}`}
                  className="size-9 rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white flex items-center justify-center transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-white"
                  title="View statement cycle hub"
                  aria-label="View card hub"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="size-4" />
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <button
                        type="button"
                        className="no-spring size-9 rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white flex items-center justify-center transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Card actions menu"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 p-1 rounded-xl shadow-lift bg-popover text-popover-foreground z-50 text-sm"
                  >
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFlipped(false);
                        setIsThemePopoverOpen(true);
                      }}
                      className="min-h-10 px-2.5 text-sm font-medium cursor-pointer flex items-center gap-2.5 hover:bg-muted rounded-lg"
                    >
                      <Palette className="size-4 text-muted-foreground" />
                      <span>Card theme</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(card);
                      }}
                      className="min-h-10 px-2.5 text-sm font-medium cursor-pointer flex items-center gap-2.5 hover:bg-muted rounded-lg"
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                      <span>Edit card</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(card.id);
                      }}
                      className="min-h-10 px-2.5 text-sm font-medium text-danger hover:bg-lighterror cursor-pointer flex items-center gap-2.5 rounded-lg"
                    >
                      <Trash2 className="size-4" />
                      <span>Delete card</span>
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
                  <div className="num text-2xl font-bold tracking-tight text-white leading-tight">
                    {formatMoney(availableToSpend)}
                  </div>
                </div>

                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${dueBadgeStyle}`}
                >
                  {dueBadgeLabel}
                </span>
              </div>

              {/* Solid Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full w-full origin-left rounded-full ${theme.barColor} transition-transform duration-(--motion-base) ease-(--ease-out)`}
                    style={{ transform: `scaleX(${Math.min(100, Math.max(0, usagePct)) / 100})` }}
                  />
                </div>
                <div className="num flex items-center justify-between gap-2 text-[11px] text-white/75 font-medium">
                  <span>{usagePct}% used</span>
                  <span>
                    {formatMoney(totalUsed)} of {formatMoney(creditLimit)}
                  </span>
                </div>
              </div>

              {/* Shared Loans Pill */}
              {loansBoughtForOthers > 0 && (
                <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/10 text-white/85 text-[11px] font-medium">
                  <span>includes {formatMoney(loansBoughtForOthers)} for others</span>
                </div>
              )}
            </div>

            {/* Back Bottom: Schedule Details (Smaller text, fits comfortably) */}
            <div className="relative z-10 pt-2 flex items-center justify-between gap-3 text-2xs">
              <div>
                <span className="text-white/65 block text-[11px]">Bill made</span>
                <span className="font-semibold text-white text-xs">
                  {getOrdinalSuffix(card.statement_day)} of month
                </span>
              </div>

              <div className="text-right">
                <span className="text-white/65 block text-[11px]">Pay by</span>
                <span className="font-semibold text-white text-xs">
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
        className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer px-3 rounded-full hover:bg-muted/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RotateCcw className="size-3.5 transition-[rotate] duration-(--motion-base) ease-(--ease-spring-pop) group-hover/card:rotate-180" />
        <span>{isFlipped ? 'Tap to view front' : 'Tap to flip'}</span>
      </button>
    </div>
  );
}
