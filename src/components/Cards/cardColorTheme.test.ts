import { describe, it, expect } from 'vitest';
import {
  CARD_ACCENTS,
  CARD_THEMES,
  CARD_PATTERNS,
  getCardTheme,
  parseCardStyle,
  formatCardStyle,
  type CardAccentId,
  type CardNetwork,
  type CardPatternId,
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

    // New premium accents
    expect(CARD_THEMES['bronze']).toBeDefined();
    expect(CARD_THEMES['bronze'].bgHex).toBe('#78350f');
    expect(CARD_THEMES['champagne']).toBeDefined();
    expect(CARD_THEMES['champagne'].bgHex).toBe('#713f12');
    expect(CARD_THEMES['midnight']).toBeDefined();
    expect(CARD_THEMES['midnight'].bgHex).toBe('#0f172a');
    expect(CARD_THEMES['burgundy']).toBeDefined();
    expect(CARD_THEMES['forest']).toBeDefined();

    // Default fallback
    expect(CARD_THEMES.default).toBeDefined();
    const fallback = CARD_THEMES['non_existent_color'] ?? CARD_THEMES.default;
    expect(fallback).toBe(CARD_THEMES.default);
  });

  it('contains exactly 20 background patterns', () => {
    expect(CARD_PATTERNS).toHaveLength(20);
    const patternIds = CARD_PATTERNS.map((p) => p.id);
    expect(patternIds).toContain('none');
    expect(patternIds).toContain('waves');
    expect(patternIds).toContain('geometric');
    expect(patternIds).toContain('dots');
    expect(patternIds).toContain('circuit');
    expect(patternIds).toContain('stripes');
    expect(patternIds).toContain('cubes');
    expect(patternIds).toContain('mesh');
    expect(patternIds).toContain('chevrons');
    expect(patternIds).toContain('rings');
    expect(patternIds).toContain('topography');
    expect(patternIds).toContain('diamonds');
    expect(patternIds).toContain('stars');
    expect(patternIds).toContain('diagonal_lines');
    expect(patternIds).toContain('moroccan');
    expect(patternIds).toContain('intersecting_circles');
    expect(patternIds).toContain('crosshatch');
    expect(patternIds).toContain('triangles');
    expect(patternIds).toContain('carbon_weave');
    expect(patternIds).toContain('sunburst');
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

  it('correctly parses JCB, UnionPay, and AMEX packed strings and new patterns', () => {
    const jcb = parseCardStyle('bronze:jcb:topography', 'RCBC Card');
    expect(jcb.themeId).toBe('bronze');
    expect(jcb.network).toBe('jcb');
    expect(jcb.pattern).toBe('topography');

    const unionpay = parseCardStyle('midnight:unionpay:sunburst', 'BDO Card');
    expect(unionpay.themeId).toBe('midnight');
    expect(unionpay.network).toBe('unionpay');
    expect(unionpay.pattern).toBe('sunburst');

    const amex = parseCardStyle('champagne:amex:carbon_weave', 'BPI Card');
    expect(amex.themeId).toBe('champagne');
    expect(amex.network).toBe('amex');
    expect(amex.pattern).toBe('carbon_weave');
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

    const jcbCard = parseCardStyle('charcoal', 'RCBC JCB Platinum');
    expect(jcbCard.network).toBe('jcb');

    const unionpayCard = parseCardStyle('burgundy', 'BDO Diamond UnionPay');
    expect(unionpayCard.network).toBe('unionpay');

    const amexCard = parseCardStyle('copper', 'BDO American Express Platinum');
    expect(amexCard.network).toBe('amex');
  });

  it('handles arbitrary custom hex colors gracefully with networks and patterns', () => {
    const custom = parseCardStyle('#2563eb', 'Custom Blue Card');
    expect(custom.theme.accentHex).toBe('#2563eb');
    expect(custom.theme.bgHex).toBe('#2563eb');

    const packedCustom = parseCardStyle('#1e293b:amex:diamonds', 'Card');
    expect(packedCustom.themeId).toBe('#1e293b');
    expect(packedCustom.theme.bgHex).toBe('#1e293b');
    expect(packedCustom.network).toBe('amex');
    expect(packedCustom.pattern).toBe('diamonds');
  });

  it('formats card style into packed string format correctly', () => {
    const packed = formatCardStyle('emerald' as CardAccentId, 'visa', 'waves');
    expect(packed).toBe('emerald:visa:waves');

    const packedJcb = formatCardStyle('#0f172a', 'jcb', 'sunburst');
    expect(packedJcb).toBe('#0f172a:jcb:sunburst');
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
