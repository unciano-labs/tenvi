/**
 * Multi-Currency & Foreign Exchange (FX) Engine
 * Commercial FinTech standard for converting multi-currency assets and liabilities
 * into a unified consolidated Net Worth.
 */

export const SUPPORTED_CURRENCIES = [
  'PHP',
  'USD',
  'EUR',
  'SGD',
  'JPY',
  'GBP',
  'CAD',
  'AUD',
  'HKD',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyMetadata {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  decimalDigits: number;
}

export const CURRENCY_REGISTRY: Record<SupportedCurrency, CurrencyMetadata> = {
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimalDigits: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimalDigits: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimalDigits: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimalDigits: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalDigits: 0 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimalDigits: 2 },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', decimalDigits: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalDigits: 2 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimalDigits: 2 },
};

/**
 * Standard baseline exchange rates (Base: PHP)
 * 1 PHP equals X target currency units.
 * Invert to get 1 Target = (1 / Rate) PHP.
 */
export const BASELINE_PHP_EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  PHP: 1.0,
  USD: 0.01754, // ~ 1 USD = 57.01 PHP
  EUR: 0.01612, // ~ 1 EUR = 62.03 PHP
  SGD: 0.02325, // ~ 1 SGD = 43.01 PHP
  JPY: 2.68450, // ~ 100 JPY = 37.25 PHP
  GBP: 0.01375, // ~ 1 GBP = 72.72 PHP
  CAD: 0.02410, // ~ 1 CAD = 41.49 PHP
  AUD: 0.02670, // ~ 1 AUD = 37.45 PHP
  HKD: 0.13680, // ~ 1 HKD = 7.31 PHP
};

export interface ExchangeRateMap {
  base: string;
  asOfDate: string;
  rates: Record<string, number>;
}

/**
 * Converts an amount from one currency to another using exchange rates relative to PHP
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number> = BASELINE_PHP_EXCHANGE_RATES
): number {
  const from = (fromCurrency || 'PHP').toUpperCase();
  const to = (toCurrency || 'PHP').toUpperCase();
  const val = Number(amount || 0);

  if (from === to || val === 0) {
    return val;
  }

  // 1. Convert from source currency to PHP base
  let amountInPhp: number;
  if (from === 'PHP') {
    amountInPhp = val;
  } else {
    const rateToFrom = rates[from] || BASELINE_PHP_EXCHANGE_RATES[from as SupportedCurrency];
    if (!rateToFrom || rateToFrom <= 0) {
      console.warn(`[FX] Missing exchange rate for ${from}, defaulting 1:1`);
      amountInPhp = val;
    } else {
      amountInPhp = val / rateToFrom;
    }
  }

  // 2. Convert from PHP base to target currency
  if (to === 'PHP') {
    return Number(amountInPhp.toFixed(2));
  }

  const rateToTarget = rates[to] || BASELINE_PHP_EXCHANGE_RATES[to as SupportedCurrency];
  if (!rateToTarget || rateToTarget <= 0) {
    console.warn(`[FX] Missing exchange rate for ${to}, defaulting 1:1`);
    return Number(amountInPhp.toFixed(2));
  }

  const result = amountInPhp * rateToTarget;
  const digits = CURRENCY_REGISTRY[to as SupportedCurrency]?.decimalDigits ?? 2;
  return Number(result.toFixed(digits));
}

/**
 * Normalizes an array of multi-currency amounts to a common base currency
 */
export function normalizeAmountsToBase(
  items: Array<{ amount: number | string | null | undefined; currency?: string | null }>,
  baseCurrency = 'PHP',
  rates: Record<string, number> = BASELINE_PHP_EXCHANGE_RATES
): number {
  return items.reduce((total, item) => {
    const amt = Number(item.amount || 0);
    const curr = item.currency || 'PHP';
    return total + convertCurrency(amt, curr, baseCurrency, rates);
  }, 0);
}

/**
 * Formats any supported currency with proper international symbol and grouping
 */
export function formatCurrencyAmount(
  amount: number | string | null | undefined,
  currencyCode = 'PHP'
): string {
  const code = (currencyCode || 'PHP').toUpperCase() as SupportedCurrency;
  const meta = CURRENCY_REGISTRY[code] || CURRENCY_REGISTRY.PHP;
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);

  if (isNaN(num)) return `${meta.symbol}0.00`;

  return `${meta.symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: meta.decimalDigits,
    maximumFractionDigits: meta.decimalDigits,
  })}`;
}
