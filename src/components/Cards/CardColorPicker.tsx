'use client';

import React, { useRef } from 'react';
import { CARD_ACCENTS } from './CardThemeTokens';
import { Check, Pipette } from 'lucide-react';

interface CardColorPickerProps {
  currentColor: string; // e.g. 'cyan' or '#2563eb' or 'emerald'
  onChange: (newColor: string) => void;
  label?: string;
  compact?: boolean;
}

export function CardColorPicker({
  currentColor,
  onChange,
  label = 'Card Color',
  compact = false,
}: CardColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const isCustomHex = currentColor?.startsWith('#');
  const matchingPreset = Object.values(CARD_ACCENTS).find(
    (a) => a.id === currentColor || a.accentHex.toLowerCase() === currentColor?.toLowerCase()
  );

  const customHexValue = isCustomHex ? currentColor : '#5d87ff';

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    onChange(hex);
  };

  const swatchSize = compact ? 'size-7 sm:size-8' : 'size-8 sm:size-9';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-label text-muted-foreground">
          {label}
        </label>
        <span className="text-3xs text-muted-foreground font-medium">Scroll for more &rarr;</span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 px-1 scrollbar-thin scroll-smooth">
        {/* Curated Presets Grid (2 rows) */}
        <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-2 sm:gap-2.5 shrink-0">
          {Object.values(CARD_ACCENTS).map((acc) => {
            const isSelected = !isCustomHex && (currentColor === acc.id || matchingPreset?.id === acc.id);
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => onChange(acc.id)}
                className={`${swatchSize} rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-xs shrink-0 ${
                  isSelected
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110 shadow-md'
                    : 'hover:opacity-90'
                }`}
                style={{ backgroundColor: acc.accentHex }}
                title={acc.name}
                aria-label={acc.name}
              >
                {isSelected && <Check className="size-3.5 sm:size-4 text-white drop-shadow stroke-[3]" />}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-14 sm:h-16 w-px bg-muted-foreground/20 shrink-0 mx-1" />

        {/* Custom Color Picker Swatch & Hex input */}
        <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 pl-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => colorInputRef.current?.click()}
              className={`${swatchSize} rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 shadow-xs ring-1 ring-inset ring-white/25 shrink-0 relative overflow-hidden ${
                isCustomHex
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110 shadow-md'
                  : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: isCustomHex ? currentColor : '#5d87ff' }}
              title="Click to open Color Picker"
              aria-label="Click to open Color Picker"
            >
              {isCustomHex ? (
                <Check className="size-3.5 sm:size-4 text-white drop-shadow stroke-[3]" />
              ) : (
                <Pipette className="size-3.5 text-white drop-shadow" />
              )}
            </button>
            <input
              ref={colorInputRef}
              type="color"
              value={customHexValue}
              onChange={handleCustomColorChange}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>

          <div className="flex items-center">
            <input
              type="text"
              value={isCustomHex ? currentColor : ''}
              placeholder="#HEX"
              maxLength={7}
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
                  onChange(val);
                } else if (!val.startsWith('#') && (val.length === 3 || val.length === 6)) {
                  onChange(`#${val}`);
                }
              }}
              className="w-14 text-center font-mono text-[10px] uppercase font-semibold h-5 px-1 rounded-md bg-muted text-foreground border-none outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
