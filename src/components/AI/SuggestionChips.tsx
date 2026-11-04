'use client';

import React from 'react';
import { CreditCard, Calendar, Banknote, TrendingUp, Sparkles } from 'lucide-react';

interface SuggestionChip {
  id: string;
  label: string;
  prompt: string;
  icon?: React.ReactNode;
}

const DEFAULT_SUGGESTION_CHIPS: SuggestionChip[] = [
  {
    id: 'chip-best-card',
    label: 'Best card today',
    prompt: 'Which card is best to swipe today?',
    icon: <CreditCard className="w-3 h-3 text-blue-500 shrink-0" />,
  },
  {
    id: 'chip-due-dates',
    label: 'Due dates',
    prompt: 'When is my next credit card due date and balance?',
    icon: <Calendar className="w-3 h-3 text-amber-500 shrink-0" />,
  },
  {
    id: 'chip-food',
    label: 'Food ₱250 cash',
    prompt: 'Paid 250 for lunch in cash',
    icon: <Banknote className="w-3 h-3 text-emerald-500 shrink-0" />,
  },
  {
    id: 'chip-coffee',
    label: 'Coffee ₱195 BDO',
    prompt: 'Bought coffee 195 with BDO card',
    icon: <CreditCard className="w-3 h-3 text-blue-500 shrink-0" />,
  },
  {
    id: 'chip-monthly-spend',
    label: 'Spend this month',
    prompt: 'How much did I spend this month?',
    icon: <TrendingUp className="w-3 h-3 text-indigo-500 shrink-0" />,
  },
  {
    id: 'chip-electric-bill',
    label: 'Electric bill Maya',
    prompt: 'Paid 3,400 electric bill via Maya',
    icon: <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />,
  },
];

interface SuggestionChipsProps {
  chips?: SuggestionChip[];
  onSelectChip: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({
  chips = DEFAULT_SUGGESTION_CHIPS,
  onSelectChip,
  disabled = false,
}: SuggestionChipsProps) {
  return (
    <div className="relative px-3 py-1.5 bg-card/60 backdrop-blur-md border-t border-border/30 shrink-0">
      {/* Faded edge gradient container */}
      <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 py-0.5 [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]">
        <div className="w-2 shrink-0" aria-hidden="true" />
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onSelectChip(chip.prompt)}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs font-semibold bg-muted/60 hover:bg-muted active:scale-95 text-foreground px-3 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/40 outline-none"
          >
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))}
        <div className="w-2 shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}

