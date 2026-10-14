import { describe, it, expect } from 'vitest';
import {
  CARD_ACCENTS,
  CARD_THEMES,
  getCardTheme,
  parseCardStyle,
  formatCardStyle,
  type CardAccentId,
} from './CardThemeTokens';

describe('Card Color Rendering and Theme Mapping (TNV-Cards)', () => {
  it('provides static theme lookup via CARD_THEMES[color] ?? CARD_THEMES.default', () => {
    // Standard accents
    expect(CARD_THEMES['red']).toBeDefined();
    expect(CARD_THEMES['red'].bgHex).toBe('#b91c1c');
    expect(CARD_THEMES['red'].bgColor).toBe('bg-[#b91c1c]');

    expect(CARD_THEMES['emerald']).toBeDefined();
    expect(CARD_THEMES['emerald'].bgHex).toBe('#065f46');
    expect(CARD_THEMES['emerald'].bgColor).toBe('bg-[#065f46]');

    expect(CARD_THEMES['purple']).toBeDefined();
    expect(CARD_THEMES['purple'].bgHex).toBe('#6b21a8');

    // Default fallback
    expect(CARD_THEMES.default).toBeDefined();
    const fallback = CARD_THEMES['non_existent_color'] ?? CARD_THEMES.default;
    expect(fallback).toBe(CARD_THEMES.default);
  });

  it('resolves color aliases properly via getCardTheme', () => {
    expect(getCardTheme('slate').id).toBe('silver');
    expect(getCardTheme('green').id).toBe('emerald');
    expect(getCardTheme('yellow').id).toBe('gold');
    expect(getCardTheme('ruby').id).toBe('rose');
    expect(getCardTheme('black').id).toBe('carbon');
    expect(getCardTheme(null).id).toBe(CARD_THEMES.default.id);
  });

  it('correctly parses packed color_theme strings (accent:network:pattern)', () => {
    const parsed = parseCardStyle('rose:mastercard:geometric', 'BDO Gold');
    expect(parsed.themeId).toBe('rose');
    expect(parsed.theme.bgHex).toBe('#be123c');
    expect(parsed.network).toBe('mastercard');
    expect(parsed.pattern).toBe('geometric');
  });

  it('auto-detects network and uses fallback pattern when not packed', () => {
    const visaCard = parseCardStyle('cyan', 'Security Bank Wave Visa');
    expect(visaCard.themeId).toBe('cyan');
    expect(visaCard.theme.bgHex).toBe('#0e7490');
    expect(visaCard.network).toBe('visa');
    expect(visaCard.pattern).toBe('none');

    const mcCard = parseCardStyle('amber', 'Citi PremierMiles Mastercard');
    expect(mcCard.themeId).toBe('amber');
    expect(mcCard.network).toBe('mastercard');
  });

  it('handles arbitrary custom hex colors gracefully', () => {
    const custom = parseCardStyle('#2563eb', 'Custom Blue Card');
    expect(custom.theme.accentHex).toBe('#2563eb');
    expect(custom.theme.bgHex).toBe('#2563eb');
  });

  it('formats card style into packed string format correctly', () => {
    const packed = formatCardStyle('emerald' as CardAccentId, 'visa', 'waves');
    expect(packed).toBe('emerald:visa:waves');
  });

  it('ensures distinct cards return distinct background colors', () => {
    const redCard = parseCardStyle('red', 'BPI Visa');
    const greenCard = parseCardStyle('emerald', 'Maya Card');
    const purpleCard = parseCardStyle('purple', 'UnionBank PlayEveryday');

    expect(redCard.theme.bgHex).not.toBe(greenCard.theme.bgHex);
    expect(redCard.theme.bgHex).not.toBe(purpleCard.theme.bgHex);
    expect(greenCard.theme.bgHex).not.toBe(purpleCard.theme.bgHex);

    expect(redCard.theme.bgHex).toBe('#b91c1c');
    expect(greenCard.theme.bgHex).toBe('#065f46');
    expect(purpleCard.theme.bgHex).toBe('#6b21a8');
  });
});
