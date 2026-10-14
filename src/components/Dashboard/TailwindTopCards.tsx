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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. True Net Worth Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-all flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug">
                Total Net Worth
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer shrink-0"
                      aria-label="Explain Net Worth"
                    />
                  }
                >
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Everything you own (Cash, Properties, Money Owed to You) minus everything you owe (Cards, Loans).
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="size-8 sm:size-9 rounded-xl bg-lightprimary text-primary flex items-center justify-center font-bold shrink-0">
                <Landmark className="size-4 sm:size-4.5" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      aria-label="Net worth options"
                    />
                  }
                >
                  <MoreVertical className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lift border border-border/60">
                  <DropdownMenuLabel className="px-2 py-1 text-2xs text-muted-foreground font-normal">
                    Net Worth Breakdown
                  </DropdownMenuLabel>
                  <div className="px-2 py-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground">Assets:</span>
                      <span className="font-semibold text-success">{formatMoney(totalAssets)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground">Debts:</span>
                      <span className="font-semibold text-danger">{formatMoney(totalLiabilities)}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={onOpenNetWorthModal}
                    className="px-2 py-1.5 text-xs font-semibold text-primary hover:bg-lightprimary rounded-lg cursor-pointer flex items-center justify-between"
                  >
                    <span>View Full Balance Sheet</span>
                    <ChevronRight className="size-3.5" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div
            className="text-2xl font-bold text-foreground mb-1 leading-tight"
            title={formatMoney(netWorth)}
          >
            {formatMoney(netWorth)}
          </div>
        </div>

        <div className="flex items-center justify-between text-2xs sm:text-[11px] text-muted-foreground/80 font-normal mt-1">
          <span>Assets − Total Debts</span>
          <button
            onClick={onOpenNetWorthModal}
            className="text-primary hover:underline font-semibold cursor-pointer shrink-0 ml-2"
          >
            Breakdown
          </button>
        </div>
      </div>

      {/* 2. Monthly Inflow Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-all flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug">
                Money Coming In
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer shrink-0"
                      aria-label="Explain Inflow"
                    />
                  }
                >
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Total salary, freelance income, and deposits received into your accounts this month.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="size-8 sm:size-9 rounded-xl bg-lightsuccess text-success flex items-center justify-center font-bold shrink-0">
              <ArrowDownLeft className="size-4 sm:size-4.5" />
            </div>
          </div>

          <div
            className="text-2xl font-bold text-foreground mb-1 leading-tight"
            title={formatMoney(monthlyInflow)}
          >
            {formatMoney(monthlyInflow)}
          </div>
        </div>

        <div className="flex items-center justify-between text-2xs sm:text-[11px] text-muted-foreground/80 font-normal mt-1">
          <span>This month's deposits</span>
          <Link href="/dashboard/transactions" className="text-primary hover:underline font-semibold shrink-0 ml-2">
            View
          </Link>
        </div>
      </div>

      {/* 3. Monthly Outflow Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-all flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug">
                Money Going Out
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer shrink-0"
                      aria-label="Explain Outflow"
                    />
                  }
                >
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Total expenses and bills paid across all bank accounts and credit cards this month.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="size-8 sm:size-9 rounded-xl bg-lighterror text-danger flex items-center justify-center font-bold shrink-0">
              <ArrowUpRight className="size-4 sm:size-4.5" />
            </div>
          </div>

          <div
            className="text-2xl font-bold text-foreground mb-1 leading-tight"
            title={formatMoney(monthlyOutflow)}
          >
            {formatMoney(monthlyOutflow)}
          </div>
        </div>

        <div className="flex items-center justify-between text-2xs sm:text-[11px] text-muted-foreground/80 font-normal mt-1">
          <span className="flex items-center gap-1 min-w-0">
            {netSavings >= 0 ? (
              <span className="text-success font-semibold flex items-center gap-0.5">
                <TrendingUp className="size-3 shrink-0" /> {savingsRate}% saved
              </span>
            ) : (
              <span className="text-danger font-semibold flex items-center gap-0.5">
                <TrendingDown className="size-3 shrink-0" /> Over budget
              </span>
            )}
          </span>
          <Link href="/dashboard/transactions" className="text-primary hover:underline font-semibold shrink-0 ml-2">
            Spending
          </Link>
        </div>
      </div>

      {/* 4. Total Liabilities / Debts Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-all flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug">
                Total Debts & Owed
              </span>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer shrink-0"
                      aria-label="Explain Debts"
                    />
                  }
                >
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Sum of credit card balances, personal loans, and property mortgages you currently owe.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="size-8 sm:size-9 rounded-xl bg-lightwarning text-warning flex items-center justify-center font-bold shrink-0">
                <CreditCard className="size-4 sm:size-4.5" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      aria-label="Debt options"
                    />
                  }
                >
                  <MoreVertical className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl shadow-lift border border-border/60">
                  <DropdownMenuItem
                    className="px-2 py-1.5 text-xs text-foreground hover:bg-lightprimary hover:text-primary rounded-lg cursor-pointer"
                    render={<Link href="/dashboard/cards" />}
                  >
                    <span>Manage Credit Cards</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="px-2 py-1.5 text-xs text-foreground hover:bg-lightprimary hover:text-primary rounded-lg cursor-pointer"
                    render={<Link href="/dashboard/loans" />}
                  >
                    <span>View Loans & Mortgages</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div
            className="text-2xl font-bold text-foreground mb-1 leading-tight"
            title={formatMoney(totalLiabilities)}
          >
            {formatMoney(totalLiabilities)}
          </div>
        </div>

        <div className="flex items-center justify-between text-2xs sm:text-[11px] text-muted-foreground/80 font-normal mt-1">
          <span>Cards & loan balances</span>
          <Link href="/dashboard/cards" className="text-primary hover:underline font-semibold shrink-0 ml-2">
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}
