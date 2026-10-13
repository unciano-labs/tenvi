import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTodayManila,
  getTodayManilaString,
  getCardUrgency,
  getUsageLevel,
  calculateCardCycleDates,
  clampDayOfMonth,
} from './calculations';

describe('TNV-015: getTodayManila()', () => {
  it('correctly calculates Manila date across midnight boundaries', () => {
    // 2026-10-08 16:30:00 UTC is 2026-10-09 00:30:00 in Manila (+8)
    const refDate = new Date('2026-10-08T16:30:00.000Z');
    const manilaToday = getTodayManila(refDate);

    expect(manilaToday.getUTCFullYear()).toBe(2026);
    expect(manilaToday.getUTCMonth()).toBe(9); // 0-indexed October
    expect(manilaToday.getUTCDate()).toBe(9);

    const str = getTodayManilaString(refDate);
    expect(str).toBe('2026-10-09');
  });

  it('normalizes to 00:00:00 UTC cleanly', () => {
    const refDate = new Date('2026-10-09T03:45:12.345Z');
    const manilaToday = getTodayManila(refDate);
    expect(manilaToday.getUTCHours()).toBe(0);
    expect(manilaToday.getUTCMinutes()).toBe(0);
    expect(manilaToday.getUTCSeconds()).toBe(0);
  });
});

describe('TNV-014: getUsageLevel()', () => {
  it('returns healthy below 50%', () => {
    const res = getUsageLevel(49);
    expect(res.level).toBe('healthy');
    expect(res.label).toBe('Healthy usage');
    expect(res.variant).toBe('success');
  });

  it('returns high at boundary 50%', () => {
    const res = getUsageLevel(50);
    expect(res.level).toBe('high');
    expect(res.label).toBe('High usage');
    expect(res.variant).toBe('warning');
  });

  it('returns high at boundary 79%', () => {
    const res = getUsageLevel(79);
    expect(res.level).toBe('high');
    expect(res.label).toBe('High usage');
    expect(res.variant).toBe('warning');
  });

  it('returns maxed at boundary 80%', () => {
    const res = getUsageLevel(80);
    expect(res.level).toBe('maxed');
    expect(res.label).toBe('Near limit');
    expect(res.variant).toBe('danger');
  });

  it('handles 0% and extreme values', () => {
    expect(getUsageLevel(0).level).toBe('healthy');
    expect(getUsageLevel(120).level).toBe('maxed');
  });
});

describe('TNV-013: getCardUrgency()', () => {
  const asOf = new Date(Date.UTC(2026, 9, 15)); // Oct 15, 2026

  it('returns none when billedAmount is 0 or less', () => {
    const resZero = getCardUrgency(new Date(Date.UTC(2026, 9, 16)), 0, asOf);
    expect(resZero.urgency).toBe('none');
    expect(resZero.label).toBe('Nothing to pay right now');

    const resNegative = getCardUrgency(new Date(Date.UTC(2026, 9, 10)), -50, asOf);
    expect(resNegative.urgency).toBe('none');
  });

  it('returns overdue when due date has passed with unpaid balance', () => {
    const pastDue = new Date(Date.UTC(2026, 9, 13)); // 2 days ago
    const res = getCardUrgency(pastDue, 5000, asOf);
    expect(res.urgency).toBe('overdue');
    expect(res.label).toBe('Overdue by 2 days');
    expect(res.variant).toBe('danger');
  });

  it('returns urgent when 3 days or fewer remaining', () => {
    // Due today
    const dueToday = new Date(Date.UTC(2026, 9, 15));
    expect(getCardUrgency(dueToday, 2500, asOf).urgency).toBe('urgent');
    expect(getCardUrgency(dueToday, 2500, asOf).label).toBe('Due today');

    // Due tomorrow (1 day)
    const dueTomorrow = new Date(Date.UTC(2026, 9, 16));
    expect(getCardUrgency(dueTomorrow, 2500, asOf).urgency).toBe('urgent');
    expect(getCardUrgency(dueTomorrow, 2500, asOf).label).toBe('Due tomorrow');

    // Due in 3 days
    const dueIn3Days = new Date(Date.UTC(2026, 9, 18));
    expect(getCardUrgency(dueIn3Days, 2500, asOf).urgency).toBe('urgent');
    expect(getCardUrgency(dueIn3Days, 2500, asOf).label).toBe('Due in 3 days');
  });

  it('returns soon when 4 to 7 days remaining', () => {
    const dueIn5Days = new Date(Date.UTC(2026, 9, 20));
    const res5 = getCardUrgency(dueIn5Days, 4000, asOf);
    expect(res5.urgency).toBe('soon');
    expect(res5.label).toBe('Due in 5 days');
    expect(res5.variant).toBe('warning');

    const dueIn7Days = new Date(Date.UTC(2026, 9, 22));
    const res7 = getCardUrgency(dueIn7Days, 4000, asOf);
    expect(res7.urgency).toBe('soon');
    expect(res7.label).toBe('Due in 7 days');
  });

  it('returns ok when more than 7 days remaining', () => {
    const dueIn12Days = new Date(Date.UTC(2026, 9, 27));
    const res = getCardUrgency(dueIn12Days, 12000, asOf);
    expect(res.urgency).toBe('ok');
    expect(res.label).toBe('Due in 12 days');
    expect(res.variant).toBe('success');
  });
});

describe('TNV-016: Cycle and due date arithmetic & month-end clamping', () => {
  it('clamps days 29, 30, 31 for shorter months and leap years', () => {
    // February 2026 (non-leap year): max 28 days
    expect(clampDayOfMonth(2026, 1, 31)).toBe(28);
    expect(clampDayOfMonth(2026, 1, 29)).toBe(28);

    // February 2028 (leap year): max 29 days
    expect(clampDayOfMonth(2028, 1, 31)).toBe(29);
    expect(clampDayOfMonth(2028, 1, 29)).toBe(29);

    // April (month 3): max 30 days
    expect(clampDayOfMonth(2026, 3, 31)).toBe(30);
  });

  it('handles due day earlier than statement day (cross-month billing cycle)', () => {
    // Statement on the 25th, payment due on the 10th of next month
    const asOf = new Date(Date.UTC(2026, 9, 10)); // Oct 10
    const dates = calculateCardCycleDates(25, 10, asOf);

    // Current cycle ends Oct 25
    expect(dates.cycleEnd.getUTCDate()).toBe(25);
    expect(dates.cycleEnd.getUTCMonth()).toBe(9);

    // Payment due Nov 10
    expect(dates.dueDate.getUTCDate()).toBe(10);
    expect(dates.dueDate.getUTCMonth()).toBe(10); // November
    expect(dates.daysToPay).toBe(31);
  });

  it('detects when cutoff falls exactly on today', () => {
    const asOf = new Date(Date.UTC(2026, 9, 25)); // Oct 25
    const dates = calculateCardCycleDates(25, 15, asOf);
    expect(dates.isCutoffToday).toBe(true);
  });

  it('correctly advances to next cycle when today is past current cutoff', () => {
    const asOf = new Date(Date.UTC(2026, 9, 26)); // Oct 26 (cutoff was 25th)
    const dates = calculateCardCycleDates(25, 15, asOf);

    // Next cycle ends Nov 25
    expect(dates.cycleEnd.getUTCMonth()).toBe(10); // Nov
    expect(dates.cycleEnd.getUTCDate()).toBe(25);
  });
});
