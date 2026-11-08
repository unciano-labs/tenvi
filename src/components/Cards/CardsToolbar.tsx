"use client"

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, X } from 'lucide-react';

export type CardSortOption = 'due_date' | 'most_used' | 'most_left';

interface CardsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedBank: string;
  onBankChange: (bank: string) => void;
  sortBy: CardSortOption;
  onSortChange: (sort: CardSortOption) => void;
  banks: string[];
  totalCount: number;
  filteredCount: number;
  onClearFilters: () => void;
}

export function CardsToolbar({
  searchQuery,
  onSearchChange,
  selectedBank,
  onBankChange,
  sortBy,
  onSortChange,
  banks,
  totalCount,
  filteredCount,
  onClearFilters,
}: CardsToolbarProps) {
  const hasActiveFilters = searchQuery.trim() !== '' || selectedBank !== 'all';

  return (
    <div className="flex flex-col gap-3">
      {/* Wraps intrinsically: search keeps ≥16rem, bank select ≥11rem, sort rail drops to its own line when space runs out */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative min-w-[min(100%,16rem)] flex-[1_1_16rem]">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search bank, card name, or last 4 digits"
            aria-label="Search cards"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-11 min-h-12 h-12 rounded-xl bg-muted text-ellipsis"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="min-w-[min(100%,11rem)] flex-[1_1_11rem] sm:max-w-56">
          <Select value={selectedBank} onValueChange={(val) => onBankChange(val || 'all')}>
            <SelectTrigger className="min-h-12 h-12 rounded-xl bg-muted" aria-label="Filter by bank">
              <SelectValue placeholder="All banks" className="block min-w-0 truncate">
                  {(value: string | null) => (!value || value === 'all' ? 'All banks' : value)}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All banks</SelectItem>
              {banks.map((bank) => (
                <SelectItem key={bank} value={bank}>
                  {bank}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Controls */}
        <div className="flex min-w-0 max-w-full items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-label text-muted-foreground shrink-0 hidden @3xl/main:inline">
            Sort by
          </span>
          <ToggleGroup
            value={[sortBy]}
            onValueChange={(val) => {
              const selected = Array.isArray(val) && val.length > 0 ? (val[val.length - 1] as CardSortOption) : null;
              if (selected) onSortChange(selected);
            }}
            aria-label="Sort cards"
            className="bg-muted p-1 rounded-xl shrink-0"
          >
            <ToggleGroupItem value="due_date" className="shrink-0 rounded-lg text-sm px-3 min-h-10">
              Pay date
            </ToggleGroupItem>
            <ToggleGroupItem value="most_used" className="shrink-0 rounded-lg text-sm px-3 min-h-10">
              Most used
            </ToggleGroupItem>
            <ToggleGroupItem value="most_left" className="shrink-0 rounded-lg text-sm px-3 min-h-10">
              Most left
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Filter status & clear action */}
      <div className="flex min-h-8 items-center justify-between gap-3 px-1 text-sm text-muted-foreground">
        <p aria-live="polite">
          Showing <span className="num font-semibold text-foreground">{filteredCount}</span> of{' '}
          <span className="num font-semibold text-foreground">{totalCount}</span> {totalCount === 1 ? 'card' : 'cards'}
        </p>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 min-h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
