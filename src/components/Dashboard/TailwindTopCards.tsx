'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Landmark, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard,
  MoreVertical,
  Info,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatMoney } from '@/lib/finance/calculations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TailwindTopCardsProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  onOpenNetWorthModal: () => void;
}

export function TailwindTopCards({
  netWorth,
  totalAssets,
  totalLiabilities,
  monthlyInflow,
  monthlyOutflow,
  onOpenNetWorthModal,
}: TailwindTopCardsProps) {
  const netSavings = monthlyInflow - monthlyOutflow;
  const savingsRate = monthlyInflow > 0 ? Math.round((netSavings / monthlyInflow) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 @2xl/main:grid-cols-3 @5xl/main:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,1fr))]">
      {/* 1. Net worth — the page's hero figure: one solid brand surface, everything else stays quiet */}
      <section
        aria-label="Net worth"
        className="@container col-span-2 @2xl/main:col-span-3 @5xl/main:col-span-1 flex min-w-0 flex-col gap-5 rounded-3xl bg-primary p-5 sm:p-6 text-primary-foreground shadow-card"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <Landmark className="size-4 shrink-0" aria-hidden="true" />
            <span className="text-label">Net worth</span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={infoButtonOnBrand}
                    aria-label="Explain Net Worth"
                  />
                }
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">
                Everything you own (Cash, Properties, Money Owed to You) minus everything you owe (Cards, Loans).
              </TooltipContent>
            </Tooltip>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="-m-1.5 size-10 shrink-0 rounded-xl flex items-center justify-center cursor-pointer hover:bg-primary-foreground/15 outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground transition-colors duration-(--motion-fast) ease-(--ease-in-out)"
                  aria-label="Net worth options"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-xl shadow-lift">
              <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground font-normal">
                Net worth breakdown
              </DropdownMenuLabel>
              <div className="px-2 py-1 text-sm">
                <div className="flex justify-between gap-4 py-0.5">
                  <span className="text-muted-foreground">Assets</span>
                  <span className="num font-semibold text-success">{formatMoney(totalAssets)}</span>
                </div>
                <div className="flex justify-between gap-4 py-0.5">
                  <span className="text-muted-foreground">Debts</span>
                  <span className="num font-semibold text-danger">{formatMoney(totalLiabilities)}</span>
                </div>
              </div>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={onOpenNetWorthModal}
                className="px-2 py-2 text-sm font-semibold text-primary rounded-lg cursor-pointer flex items-center justify-between"
              >
                <span>View full balance sheet</span>
                <ChevronRight className="size-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p
          className="num min-w-0 whitespace-nowrap font-bold leading-none tracking-[-0.03em]"
          style={fitFigureSize(formatMoney(netWorth), 2.75)}
        >
          {formatMoney(netWorth)}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-2 text-sm">
          <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-1">
            <div className="min-w-0">
              <dt className="text-xs opacity-90">Assets</dt>
              <dd className="num font-semibold">{formatMoney(totalAssets)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs opacity-90">− Debts</dt>
              <dd className="num font-semibold">{formatMoney(totalLiabilities)}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onOpenNetWorthModal}
            className="no-spring -mx-2 -my-1 inline-flex h-9 items-center gap-0.5 rounded-lg px-2 font-semibold underline-offset-4 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground cursor-pointer"
          >
            Breakdown
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

      {/* 2. Monthly inflow */}
      <div className={statCard}>
        <StatHeader
          label="Money in"
          tooltipLabel="Explain Inflow"
          tooltip="Total salary, freelance income, and deposits received into your accounts this month."
          icon={<ArrowDownLeft className="size-4" />}
          iconClass="bg-lightsuccess text-success"
        />
        <p className={statFigure()} style={fitFigureSize(formatMoney(monthlyInflow), 1.875)}>{formatMoney(monthlyInflow)}</p>
        <div className={statFooter}>
          <span className="min-w-0 truncate">Deposits</span>
          <Link href="/dashboard/transactions" className={statLink}>
            View
          </Link>
        </div>
      </div>

      {/* 3. Monthly outflow */}
      <div className={statCard}>
        <StatHeader
          label="Money out"
          tooltipLabel="Explain Outflow"
          tooltip="Total expenses and bills paid across all bank accounts and credit cards this month."
          icon={<ArrowUpRight className="size-4" />}
          iconClass="bg-lighterror text-danger"
        />
        <p className={statFigure()} style={fitFigureSize(formatMoney(monthlyOutflow), 1.875)}>{formatMoney(monthlyOutflow)}</p>
        <div className={statFooter}>
          {netSavings >= 0 ? (
            <span className="num inline-flex min-w-0 items-center gap-1 font-semibold text-success">
              <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" /> {savingsRate}%
            </span>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-danger">
              <TrendingDown className="size-3.5 shrink-0" aria-hidden="true" /> Over
            </span>
          )}
          <Link href="/dashboard/transactions" className={statLink}>
            Spending
          </Link>
        </div>
      </div>

      {/* 4. Total liabilities / debts */}
      <div className={`${statCard} col-span-2 @2xl/main:col-span-1`}>
        <StatHeader
          label="Total debts"
          tooltipLabel="Explain Debts"
          tooltip="Sum of credit card balances, personal loans, and property mortgages you currently owe."
          icon={<CreditCard className="size-4" />}
          iconClass="bg-lightwarning text-warning-soft-foreground"
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="-mr-1.5 size-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-(--motion-fast) ease-(--ease-in-out) shrink-0"
                    aria-label="Debt options"
                  />
                }
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lift">
                <DropdownMenuItem
                  className="px-2 py-2 text-sm text-foreground rounded-lg cursor-pointer"
                  render={<Link href="/dashboard/cards" />}
                >
                  <span>Manage credit cards</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="px-2 py-2 text-sm text-foreground rounded-lg cursor-pointer"
                  render={<Link href="/dashboard/loans" />}
                >
                  <span>View loans & mortgages</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <p className={statFigure()} style={fitFigureSize(formatMoney(totalLiabilities), 1.875)}>{formatMoney(totalLiabilities)}</p>
        <div className={statFooter}>
          <span className="min-w-0 truncate">Balances</span>
          <Link href="/dashboard/cards" className={statLink}>
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}

const infoButtonOnBrand =
  'inline-flex size-6 items-center justify-center rounded-md opacity-80 hover:opacity-100 cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground';

const statCard = '@container flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-4 sm:p-5 text-card-foreground shadow-card';
// Figures scale with their own card width (cqi) based on character count, so any amount
// stays on one line (never breaks mid-number) and short amounts stay large.
const statFigureBase = 'num min-w-0 whitespace-nowrap font-bold leading-[1.1] tracking-[-0.02em] text-foreground';
/** Font size that fits `text` on one line in its @container: tabular digits are ~0.62em wide. */
function fitFigureSize(text: string, maxRem: number): React.CSSProperties {
  const cqi = 100 / (Math.max(text.length, 4) * 0.62);
  return { fontSize: `min(${maxRem}rem, ${cqi.toFixed(2)}cqi)` };
}
function statFigure() {
  return statFigureBase;
}
const statFooter = 'mt-auto flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground';
const statLink =
  'shrink-0 -my-2 -mx-1.5 inline-flex h-8 items-center rounded-md px-1.5 font-semibold text-primary hover:underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring';

function StatHeader({
  label,
  tooltip,
  tooltipLabel,
  icon,
  iconClass,
  menu,
}: {
  label: string;
  tooltip: string;
  tooltipLabel: string;
  icon: React.ReactNode;
  iconClass: string;
  menu?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 text-label text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="hidden sm:inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/80 hover:text-foreground cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={tooltipLabel}
              />
            }
          >
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className={`size-8 rounded-xl flex items-center justify-center ${iconClass}`} aria-hidden="true">
          {icon}
        </div>
        {menu}
      </div>
    </div>
  );
}
