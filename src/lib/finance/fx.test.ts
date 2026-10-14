import { describe, it, expect } from 'vitest';
import {
  convertCurrency,
  normalizeAmountsToBase,
  formatCurrencyAmount,
  BASELINE_PHP_EXCHANGE_RATES,
} from './fx';
import { calculateTrueNetWorth } from './calculations';

describe('Multi-Currency & FX Engine (Task 4.1)', () => {
  it('converts amounts accurately between PHP, USD, and EUR', () => {
    // 1 USD = 1 / 0.01754 ≈ 57.01 PHP
    const usdInPhp = convertCurrency(100, 'USD', 'PHP');
    expect(usdInPhp).toBeCloseTo(5701.25, 1);

    // 1000 PHP to USD
    const phpInUsd = convertCurrency(1000, 'PHP', 'USD');
    expect(phpInUsd).toBeCloseTo(17.54, 1);

    // Identity conversion
    expect(convertCurrency(500, 'PHP', 'PHP')).toBe(500);
    expect(convertCurrency(250, 'USD', 'USD')).toBe(250);
  });

  it('handles triangular cross-currency conversion without intermediate precision drift', () => {
    // USD to EUR via PHP base
    const usdToEur = convertCurrency(100, 'USD', 'EUR');
    expect(usdToEur).toBeGreaterThan(80);
    expect(usdToEur).toBeLessThan(110);

    // JPY conversion respects zero decimal places
    const phpToJpy = convertCurrency(100, 'PHP', 'JPY');
    expect(phpToJpy).toBe(268);
  });

  it('normalizes multi-currency array of assets to base PHP', () => {
    const assets = [
      { amount: 10000, currency: 'PHP' },
      { amount: 100, currency: 'USD' }, // ~5,701 PHP
      { amount: 50, currency: 'EUR' },  // ~3,101 PHP
    ];

    const totalPhp = normalizeAmountsToBase(assets, 'PHP');
    expect(totalPhp).toBeGreaterThan(18000);
    expect(totalPhp).toBeLessThan(19500);
  });

  it('formats international currencies with proper symbols and precision', () => {
    expect(formatCurrencyAmount(1250.5, 'PHP')).toBe('₱1,250.50');
    expect(formatCurrencyAmount(3400.75, 'USD')).toBe('$3,400.75');
    expect(formatCurrencyAmount(5000, 'JPY')).toBe('¥5,000');
    expect(formatCurrencyAmount(750.25, 'EUR')).toBe('€750.25');
  });

  it('integrates multi-currency conversion into calculateTrueNetWorth', () => {
    const netWorth = calculateTrueNetWorth({
      savings: [
        { current_balance: 50000, currency: 'PHP' },
        { current_balance: 1000, currency: 'USD' }, // ~57,012.54 PHP
      ],
      loans: [],
      properties: [
        { estimated_value: 500000, currency: 'PHP' },
      ],
      creditCards: [
        {
          latest_statement: { billed_amount: 100, paid_amount: 0 },
          currency: 'USD', // ~5,701.25 PHP
        },
      ],
      liabilities: [],
      baseCurrency: 'PHP',
      exchangeRates: BASELINE_PHP_EXCHANGE_RATES,
    });

    // Total assets should be 50k + ~57k + 500k ≈ 607k
    expect(netWorth.totalAssets).toBeGreaterThan(600000);
    // Liabilities should be ~5,701 PHP
    expect(netWorth.totalLiabilities).toBeGreaterThan(5000);
    expect(netWorth.totalLiabilities).toBeLessThan(6500);
    // Net worth should be assets - liabilities
    expect(netWorth.netWorth).toBeCloseTo(netWorth.totalAssets - netWorth.totalLiabilities, 2);
  });
});
