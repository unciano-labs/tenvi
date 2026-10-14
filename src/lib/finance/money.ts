/**
 * Money Value Object & Financial Math Utility
 * 
 * Implements minor integer unit (centavo) arithmetic using BigInt to eliminate
 * IEEE-754 floating-point inaccuracies, penny leakage, and rounding drift.
 */

const ZERO_BIGINT = BigInt(0);
const ONE_BIGINT = BigInt(1);
const NEG_ONE_BIGINT = BigInt(-1);
const TEN_BIGINT = BigInt(10);
const MULTIPLIER_PRECISION = BigInt(1_000_000);
const MULTIPLIER_HALF = BigInt(500_000);

export class Money {
  readonly amount: bigint; // Amount in minor units (e.g., centavos: BigInt(1000) = ₱10.00)
  readonly currency: string;
  readonly scale: number;

  constructor(amount: bigint | number, currency = 'PHP', scale = 2) {
    this.amount = typeof amount === 'bigint' ? amount : BigInt(Math.round(amount));
    this.currency = currency.toUpperCase();
    this.scale = scale;
  }

  /**
   * Constructs a Money object from a decimal number or string (e.g., 125.50 -> BigInt(12550)).
   */
  static fromDecimal(value: number | string, currency = 'PHP', scale = 2): Money {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new TypeError(`Cannot create Money from non-finite number: ${value}`);
      }
      value = value.toFixed(scale);
    }

    const cleanStr = value.trim().replace(/,/g, '');
    const parts = cleanStr.split('.');
    const integerPart = parts[0] || '0';
    let fractionPart = parts[1] || '';

    if (fractionPart.length < scale) {
      fractionPart = fractionPart.padEnd(scale, '0');
    } else if (fractionPart.length > scale) {
      // Half-up rounding on excess precision
      const extraDigits = fractionPart.slice(scale);
      fractionPart = fractionPart.slice(0, scale);
      if (parseInt(extraDigits[0], 10) >= 5) {
        const roundedFraction = BigInt(fractionPart) + ONE_BIGINT;
        fractionPart = roundedFraction.toString().padStart(scale, '0');
      }
    }

    const isNegative = integerPart.startsWith('-');
    const absInteger = integerPart.replace(/^-/, '');
    const combinedStr = `${absInteger}${fractionPart}`;
    const minorUnits = BigInt(combinedStr);

    return new Money(isNegative ? -minorUnits : minorUnits, currency, scale);
  }

  /**
   * Constructs a Money object with 0 balance.
   */
  static zero(currency = 'PHP', scale = 2): Money {
    return new Money(ZERO_BIGINT, currency, scale);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: cannot perform operation between ${this.currency} and ${other.currency}`);
    }
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency, this.scale);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency, this.scale);
  }

  /**
   * Multiplies money by a factor.
   * Uses half-up rounding to nearest minor unit.
   */
  multiply(factor: number): Money {
    if (!Number.isFinite(factor)) {
      throw new TypeError(`Multiplier must be a finite number: ${factor}`);
    }
    const factorScaled = Math.round(factor * 1_000_000);
    const product = this.amount * BigInt(factorScaled);
    const remainder = product % MULTIPLIER_PRECISION;
    let rounded = product / MULTIPLIER_PRECISION;

    if (remainder >= MULTIPLIER_HALF || remainder <= -MULTIPLIER_HALF) {
      rounded += this.amount >= ZERO_BIGINT ? ONE_BIGINT : NEG_ONE_BIGINT;
    }

    return new Money(rounded, this.currency, this.scale);
  }

  /**
   * Divides an amount according to ratios without losing single cents (penny allocation).
   * E.g. allocating 100 cents across [1, 1, 1] yields [34, 33, 33], preserving the exact total.
   */
  allocate(ratios: number[]): Money[] {
    if (ratios.length === 0) {
      return [];
    }

    const totalWeight = ratios.reduce((sum, r) => sum + r, 0);
    if (totalWeight <= 0) {
      throw new Error('Total ratio weight must be greater than zero');
    }

    const results: bigint[] = [];
    let remainder = this.amount;

    for (let i = 0; i < ratios.length; i++) {
      const share = (this.amount * BigInt(ratios[i])) / BigInt(totalWeight);
      results.push(share);
      remainder -= share;
    }

    const step = remainder > ZERO_BIGINT ? ONE_BIGINT : NEG_ONE_BIGINT;
    let idx = 0;
    while (remainder !== ZERO_BIGINT) {
      results[idx % results.length] += step;
      remainder -= step;
      idx++;
    }

    return results.map((minor) => new Money(minor, this.currency, this.scale));
  }

  /**
   * Converts minor units to float representation (strictly for UI display/formatting).
   */
  toDecimal(): number {
    const divisor = Number(TEN_BIGINT ** BigInt(this.scale));
    return Number(this.amount) / divisor;
  }

  /**
   * Returns exact decimal string (e.g., "125.50").
   */
  toDecimalString(): string {
    const isNegative = this.amount < ZERO_BIGINT;
    const abs = isNegative ? -this.amount : this.amount;
    const divisor = TEN_BIGINT ** BigInt(this.scale);
    const integerPart = (abs / divisor).toString();
    const fractionPart = (abs % divisor).toString().padStart(this.scale, '0');
    return `${isNegative ? '-' : ''}${integerPart}.${fractionPart}`;
  }

  /**
   * Formats into localized currency string (e.g. ₱1,250.50).
   */
  format(locale = 'en-PH'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: this.scale,
      maximumFractionDigits: this.scale,
    }).format(this.toDecimal());
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }

  isZero(): boolean {
    return this.amount === ZERO_BIGINT;
  }

  isPositive(): boolean {
    return this.amount > ZERO_BIGINT;
  }

  isNegative(): boolean {
    return this.amount < ZERO_BIGINT;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  compareTo(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.amount > other.amount) return 1;
    if (this.amount < other.amount) return -1;
    return 0;
  }
}
