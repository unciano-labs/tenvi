import { describe, it, expect } from 'vitest';
import { Money } from './money';

describe('Money Value Object', () => {
  it('correctly handles floating point precision without IEEE-754 errors', () => {
    const a = Money.fromDecimal(0.1);
    const b = Money.fromDecimal(0.2);
    const sum = a.add(b);

    expect(sum.toDecimal()).toBe(0.3);
    expect(sum.amount).toBe(BigInt(30));
    expect(sum.toDecimalString()).toBe('0.30');
  });

  it('performs addition and subtraction accurately', () => {
    const m1 = Money.fromDecimal(1250.75);
    const m2 = Money.fromDecimal(249.25);

    const added = m1.add(m2);
    expect(added.toDecimal()).toBe(1500.0);
    expect(added.amount).toBe(BigInt(150000));

    const subtracted = m1.subtract(m2);
    expect(subtracted.toDecimal()).toBe(1001.5);
    expect(subtracted.amount).toBe(BigInt(100150));
  });

  it('handles negative balances correctly', () => {
    const pos = Money.fromDecimal(50.0);
    const larger = Money.fromDecimal(75.5);
    const neg = pos.subtract(larger);

    expect(neg.isNegative()).toBe(true);
    expect(neg.toDecimal()).toBe(-25.5);
    expect(neg.toDecimalString()).toBe('-25.50');
    expect(neg.amount).toBe(BigInt(-2550));
  });

  it('multiplies by scalar with half-up rounding', () => {
    const m = Money.fromDecimal(10.55);
    // 10.55 * 1.12 (e.g. 12% VAT) = 11.816 -> rounds to 11.82
    const withVat = m.multiply(1.12);
    expect(withVat.toDecimal()).toBe(11.82);
    expect(withVat.amount).toBe(BigInt(1182));
  });

  it('allocates amounts without losing or generating pennies', () => {
    // ₱100.00 split 3 ways equally
    const bill = Money.fromDecimal(100.0);
    const shares = bill.allocate([1, 1, 1]);

    expect(shares).toHaveLength(3);
    expect(shares.map((s) => s.toDecimal())).toEqual([33.34, 33.33, 33.33]);

    // Sum of shares must equal exactly 100.00
    const totalAllocated = shares.reduce((acc, curr) => acc.add(curr), Money.zero());
    expect(totalAllocated.equals(bill)).toBe(true);
  });

  it('allocates according to uneven weighted ratios', () => {
    // ₱1000.00 split 70% / 20% / 10%
    const investment = Money.fromDecimal(1000.0);
    const split = investment.allocate([70, 20, 10]);

    expect(split.map((s) => s.toDecimal())).toEqual([700.0, 200.0, 100.0]);
  });

  it('throws error when performing operations on mismatched currencies', () => {
    const php = Money.fromDecimal(100, 'PHP');
    const usd = Money.fromDecimal(100, 'USD');

    expect(() => php.add(usd)).toThrowError(/Currency mismatch/);
    expect(() => php.subtract(usd)).toThrowError(/Currency mismatch/);
    expect(() => php.greaterThan(usd)).toThrowError(/Currency mismatch/);
  });

  it('formats correctly with locale and currency symbol', () => {
    const m = Money.fromDecimal(1250500.5, 'PHP');
    const formatted = m.format('en-PH');
    expect(formatted).toContain('1,250,500.50');
  });

  it('compares amounts correctly', () => {
    const a = Money.fromDecimal(100);
    const b = Money.fromDecimal(200);
    const c = Money.fromDecimal(100);

    expect(a.lessThan(b)).toBe(true);
    expect(b.greaterThan(a)).toBe(true);
    expect(a.equals(c)).toBe(true);
    expect(a.compareTo(b)).toBe(-1);
    expect(b.compareTo(a)).toBe(1);
    expect(a.compareTo(c)).toBe(0);
  });
});
