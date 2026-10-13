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
import { Search, X, SlidersHorizontal } from 'lucide-react';

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
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search & Bank Select */}
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by bank, card name, or last 4 digits..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-9 min-h-12 h-12 rounded-xl bg-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-48 shrink-0">
            <Select value={selectedBank} onValueChange={(val) => onBankChange(val || 'all')}>
              <SelectTrigger className="min-h-12 h-12 rounded-xl bg-muted">
                <SelectValue placeholder="All banks" />
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
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto no-scrollbar">
          <span className="text-xs font-medium text-muted-foreground shrink-0 hidden lg:inline">
            Sort by:
          </span>
          <ToggleGroup
            value={[sortBy]}
            onValueChange={(val) => {
              const selected = Array.isArray(val) && val.length > 0 ? (val[val.length - 1] as CardSortOption) : null;
              if (selected) onSortChange(selected);
            }}
            className="bg-muted p-1 rounded-xl"
          >
            <ToggleGroupItem value="due_date" className="rounded-lg text-xs px-3">
              Pay date
            </ToggleGroupItem>
            <ToggleGroupItem value="most_used" className="rounded-lg text-xs px-3">
              Most used
            </ToggleGroupItem>
            <ToggleGroupItem value="most_left" className="rounded-lg text-xs px-3">
              Most left
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Filter status & clear action */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <p aria-live="polite">
          Showing <span className="font-semibold text-foreground">{filteredCount}</span> of{' '}
          <span className="font-semibold text-foreground">{totalCount}</span> cards
        </p>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 size-3" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
