import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTodayManila,
  getTodayManilaString,
  getCardUrgency,
  getUsageLevel,
  calculateCardCycleDates,
  clampDayOfMonth,
  calculateTrueNetWorth,
  calculateMonthlyAmortizationPayment,
  calculateLiabilityAmortization,
  calculateAmortizationSchedule,
  calculateNextAmortizationSplit,
  calculateStraightLineDepreciation,
  calculateCardSpending,
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

describe('FIN-05: calculateTrueNetWorth()', () => {
  it('correctly aggregates assets, liabilities, and calculates net worth', () => {
    const result = calculateTrueNetWorth({
      savings: [
        { current_balance: 100000, is_active: true },
        { current_balance: 50000, is_active: true },
        { current_balance: 99999, is_active: false },
      ],
      loans: [
        { balance_remaining: 25000, status: 'unpaid' },
        { balance_remaining: 15000, status: 'partial' },
        { balance_remaining: 50000, status: 'paid' },
      ],
      properties: [
        { estimated_value: 2000000, status: 'active' },
        { estimated_value: 500000, status: 'sold' },
      ],
      creditCards: [
        { latest_statement: { billed_amount: 30000, paid_amount: 10000 } },
      ],
      liabilities: [
        { current_principal_balance: 1200000, status: 'active' },
        { current_principal_balance: 300000, status: 'paid_off' },
      ],
    });

    expect(result.liquidSavings).toBe(150000);
    expect(result.receivables).toBe(40000);
    expect(result.fixedAssets).toBe(2000000);
    expect(result.totalAssets).toBe(2190000);
    expect(result.creditCardBalances).toBe(20000);
    expect(result.longTermLiabilities).toBe(1200000);
    expect(result.totalLiabilities).toBe(1220000);
    expect(result.netWorth).toBe(970000);
    expect(result.debtToAssetRatio).toBe(56);
  });

  it('handles empty / zero balances safely without division by zero', () => {
    const result = calculateTrueNetWorth({
      savings: [],
      loans: [],
      properties: [],
    });

    expect(result.totalAssets).toBe(0);
    expect(result.totalLiabilities).toBe(0);
    expect(result.netWorth).toBe(0);
    expect(result.debtToAssetRatio).toBe(0);
  });
});

describe('calculateLiabilityAmortization()', () => {
  it('calculates monthly add-on rate amortization accurately', () => {
    // Principal: 120,000, 12 months, 1% monthly add-on
    // (120,000 / 12) + (120,000 * 0.01) = 10,000 + 1,200 = 11,200.00
    const result = calculateLiabilityAmortization({
      principal: 120000,
      termMonths: 12,
      interestRate: 1.0,
      rateType: 'monthly_addon',
    });
    expect(result).toBe(11200.0);
  });

  it('calculates real-world credit-to-cash auto loan add-on amortization', () => {
    // ₱700,000 principal, 60 months, 0.55% monthly add-on
    // (700,000 / 60) + (700,000 * 0.0055) = 11,666.67 + 3,850 = 15,516.67
    const result = calculateLiabilityAmortization({
      principal: 700000,
      termMonths: 60,
      interestRate: 0.55,
      rateType: 'monthly_addon',
    });
    expect(result).toBe(15516.67);
  });

  it('calculates standard annual rate compound reducing-balance amortization', () => {
    // ₱1,000,000 at 6% annual for 10 years (120 months)
    const result = calculateLiabilityAmortization({
      principal: 1000000,
      termMonths: 120,
      interestRate: 6.0,
      rateType: 'annual',
    });
    expect(result).toBe(11102.05);
  });

  it('handles 0% interest and edge cases gracefully', () => {
    expect(
      calculateLiabilityAmortization({
        principal: 50000,
        termMonths: 10,
        interestRate: 0,
        rateType: 'monthly_addon',
      })
    ).toBe(5000.0);

    expect(
      calculateLiabilityAmortization({
        principal: 0,
        termMonths: 12,
        interestRate: 5,
        rateType: 'annual',
      })
    ).toBe(0);

    expect(
      calculateLiabilityAmortization({
        principal: 100000,
        termMonths: 0,
        interestRate: 5,
        rateType: 'annual',
      })
    ).toBe(0);
  });
});

describe('Task 3.1: Reducing-Balance Amortization Mathematical Engine', () => {
  it('calculates monthly amortization payment for 0% interest', () => {
    const pmt = calculateMonthlyAmortizationPayment(120000, 0, 12);
    expect(pmt).toBe(10000.0);
  });

  it('calculates commercial mortgage payment with compound interest', () => {
    // ₱1,000,000 at 6% per annum for 10 years (120 months)
    const pmt = calculateMonthlyAmortizationPayment(1000000, 6, 120);
    expect(pmt).toBe(11102.05);
  });

  it('generates complete schedule and converges exactly to zero without penny drift', () => {
    const summary = calculateAmortizationSchedule({
      principal: 500000,
      annualInterestRate: 8.5,
      termMonths: 36,
      startDate: '2026-01-01',
      monthlyDueDay: 15,
    });

    expect(summary.schedule.length).toBe(36);
    expect(summary.totalPrincipal).toBe(500000);
    expect(summary.monthlyPayment).toBe(15783.77);

    // Verify first installment
    const firstRow = summary.schedule[0];
    expect(firstRow.installmentNumber).toBe(1);
    expect(firstRow.interestAmount).toBe(3541.67); // 500000 * 0.085 / 12
    expect(firstRow.principalAmount).toBe(12242.1); // 15783.77 - 3541.67
    expect(firstRow.remainingBalance).toBe(487757.9);

    // Verify final installment convergence
    const finalRow = summary.schedule[35];
    expect(finalRow.installmentNumber).toBe(36);
    expect(finalRow.remainingBalance).toBe(0); // Perfect zero convergence

    // Verify cumulative totals
    expect(summary.totalPayment).toBe(
      Number((summary.totalPrincipal + summary.totalInterest).toFixed(2))
    );
  });

  it('calculates next upcoming amortization principal vs interest split', () => {
    const split = calculateNextAmortizationSplit({
      currentBalance: 1000000,
      annualInterestRate: 6,
      monthlyPayment: 11102.05,
    });

    // 1,000,000 * (0.06 / 12) = 5,000 interest
    expect(split.interestPortion).toBe(5000.0);
    // 11,102.05 - 5,000 = 6,102.05 principal
    expect(split.principalPortion).toBe(6102.05);
    // 1,000,000 - 6,102.05 = 993,897.95 remaining
    expect(split.newBalance).toBe(993897.95);
  });

  it('handles edge cases (zero balance, empty parameters) safely', () => {
    const emptySummary = calculateAmortizationSchedule({
      principal: 0,
      annualInterestRate: 5,
      termMonths: 0,
    });
    expect(emptySummary.schedule).toEqual([]);
    expect(emptySummary.totalPayment).toBe(0);

    const zeroSplit = calculateNextAmortizationSplit({
      currentBalance: 0,
      annualInterestRate: 6,
      monthlyPayment: 1000,
    });
    expect(zeroSplit.principalPortion).toBe(0);
    expect(zeroSplit.interestPortion).toBe(0);
    expect(zeroSplit.newBalance).toBe(0);
  });

  it('handles monthly add-on interest rate schedules correctly with perfect zero convergence', () => {
    // 700,000 principal at 0.55% / mo add-on for 60 months
    // Fixed monthly interest = 700,000 * (0.55 / 100) = 3,850.00
    // Monthly principal = 700,000 / 60 = 11,666.67
    // Total monthly payment = 15,516.67
    const summary = calculateAmortizationSchedule({
      principal: 700000,
      annualInterestRate: 0.55,
      rateType: 'monthly_addon',
      interestRate: 0.55,
      termMonths: 60,
      startDate: '2026-10-05',
      monthlyDueDay: 27,
    });

    expect(summary.schedule.length).toBe(60);
    expect(summary.totalPrincipal).toBe(700000);
    expect(summary.totalInterest).toBe(231000); // 3850 * 60 = 231,000
    expect(summary.totalPayment).toBe(931000);

    // Verify first installment due date inherits credit card day 27 in current month
    const firstRow = summary.schedule[0];
    expect(firstRow.installmentNumber).toBe(1);
    expect(firstRow.dueDate).toBe('2026-10-27');
    expect(firstRow.interestAmount).toBe(3850);
    expect(firstRow.principalAmount).toBe(11666.67);
    expect(firstRow.paymentAmount).toBe(15516.67);

    // Verify second installment
    expect(summary.schedule[1].dueDate).toBe('2026-11-27');

    // Verify final installment convergence
    const finalRow = summary.schedule[59];
    expect(finalRow.installmentNumber).toBe(60);
    expect(finalRow.remainingBalance).toBe(0);
  });

  it('inherits credit card due day accurately based on approval date vs due day', () => {
    // Case 1: Approved before card due day (Oct 5 with due day 27) -> First due is Oct 27
    const scheduleBefore = calculateAmortizationSchedule({
      principal: 100000,
      annualInterestRate: 6,
      termMonths: 12,
      startDate: '2026-10-05',
      monthlyDueDay: 27,
    });
    expect(scheduleBefore.schedule[0].dueDate).toBe('2026-10-27');
    expect(scheduleBefore.schedule[1].dueDate).toBe('2026-11-27');

    // Case 2: Approved after card due day (Oct 28 with due day 27) -> First due is Nov 27
    const scheduleAfter = calculateAmortizationSchedule({
      principal: 100000,
      annualInterestRate: 6,
      termMonths: 12,
      startDate: '2026-10-28',
      monthlyDueDay: 27,
    });
    expect(scheduleAfter.schedule[0].dueDate).toBe('2026-11-27');
  });

  it('supports Buy Now Pay Later (BNPL) with custom firstPaymentDate', () => {
    // Approved Oct 5, 2026, but customer opts to start payments in Dec 2026
    const bnplSchedule = calculateAmortizationSchedule({
      principal: 150000,
      annualInterestRate: 0.55,
      rateType: 'monthly_addon',
      interestRate: 0.55,
      termMonths: 12,
      startDate: '2026-10-05',
      firstPaymentDate: '2026-12-27',
      monthlyDueDay: 27,
    });

    expect(bnplSchedule.schedule.length).toBe(12);
    expect(bnplSchedule.schedule[0].dueDate).toBe('2026-12-27');
    expect(bnplSchedule.schedule[1].dueDate).toBe('2027-01-27');
    expect(bnplSchedule.schedule[11].dueDate).toBe('2027-11-27');
    expect(bnplSchedule.schedule[11].remainingBalance).toBe(0);
  });

  it('respects manually overridden monthly amortization in schedule breakdown', () => {
    const overriddenSchedule = calculateAmortizationSchedule({
      principal: 700000,
      annualInterestRate: 6.6,
      termMonths: 60,
      startDate: '2026-10-05',
      monthlyDueDay: 27,
      monthlyPayment: 13729.12,
      isAmortizationOverridden: true,
    });

    expect(overriddenSchedule.monthlyPayment).toBe(13729.12);
    expect(overriddenSchedule.schedule[0].paymentAmount).toBe(13729.12);
    expect(overriddenSchedule.schedule[59].remainingBalance).toBe(0);
  });
});

describe('Task 3.2: Vehicle & Asset Straight-Line Depreciation Engine', () => {
  it('correctly calculates mid-life depreciation with default 10% salvage value', () => {
    // ₱1,200,000 purchased 24 months ago with 5-year (60 mo) useful life
    // Cost: 1,200,000; Salvage: 120,000; Depreciable: 1,080,000
    // Monthly: 18,000; 24 mo accumulated: 432,000; Book value: 768,000
    const purchaseDate = new Date('2024-01-15');
    const asOfDate = new Date('2026-01-15'); // Exactly 24 months later

    const result = calculateStraightLineDepreciation({
      purchasePrice: 1200000,
      purchaseDate,
      usefulLifeYears: 5,
      asOfDate,
    });

    expect(result.costBasis).toBe(1200000);
    expect(result.salvageValue).toBe(120000);
    expect(result.elapsedMonths).toBe(24);
    expect(result.monthlyDepreciation).toBe(18000);
    expect(result.accumulatedDepreciation).toBe(432000);
    expect(result.currentBookValue).toBe(768000);
    expect(result.percentDepreciated).toBe(40);
    expect(result.isFullyDepreciated).toBe(false);
  });

  it('floors book value at salvage value once useful life is exceeded', () => {
    // 72 months on a 60 month life
    const purchaseDate = new Date('2020-01-01');
    const asOfDate = new Date('2026-01-01');

    const result = calculateStraightLineDepreciation({
      purchasePrice: 1000000,
      purchaseDate,
      salvageValue: 100000,
      usefulLifeYears: 5,
      asOfDate,
    });

    expect(result.accumulatedDepreciation).toBe(900000); // capped at cost - salvage
    expect(result.currentBookValue).toBe(100000); // exactly salvage value
    expect(result.isFullyDepreciated).toBe(true);
    expect(result.percentDepreciated).toBe(100);
  });

  it('handles zero or negative purchase price safely', () => {
    const result = calculateStraightLineDepreciation({
      purchasePrice: 0,
      purchaseDate: '2026-01-01',
    });

    expect(result.costBasis).toBe(0);
    expect(result.currentBookValue).toBe(0);
    expect(result.accumulatedDepreciation).toBe(0);
  });
});

describe('calculateCardSpending()', () => {
  const cardA = { id: 'card-a', credit_limit: 50000 };
  const cardB = { id: 'card-b', credit_limit: 100000 };

  it('correctly calculates direct spend and available spending', () => {
    const transactions = [
      { id: '1', credit_card_id: 'card-a', kind: 'expense', amount: 5000, loan_id: null },
      { id: '2', credit_card_id: 'card-a', kind: 'expense', amount: 3000, loan_id: null },
      { id: '3', credit_card_id: 'card-b', kind: 'expense', amount: 15000, loan_id: null },
      { id: '4', credit_card_id: 'card-a', kind: 'income', amount: 2000, loan_id: null },
    ];

    const result = calculateCardSpending(cardA, transactions, []);
    expect(result.directSpend).toBe(8000);
    expect(result.loansSpend).toBe(0);
    expect(result.totalUsed).toBe(8000);
    expect(result.availableToSpend).toBe(42000); // 50000 - 8000
    expect(result.utilizationPercent).toBe(16); // 8000 / 50000 * 100
  });

  it('excludes loan-linked expenses to avoid double counting with loans balance', () => {
    const transactions = [
      // Regular expense on card
      { id: '1', credit_card_id: 'card-a', kind: 'expense', amount: 5000, loan_id: null },
      // Loan expense on card (recorded when swiping for a friend)
      { id: '2', credit_card_id: 'card-a', kind: 'expense', amount: 10000, loan_id: 'loan-1' },
      // Installment expense linked to loan
      { id: '3', credit_card_id: 'card-a', kind: 'expense', amount: 2500, loan_id: 'loan-2' },
    ];

    const loans = [
      { id: 'loan-1', credit_card_id: 'card-a', balance_remaining: 10000, status: 'active' },
      { id: 'loan-2', credit_card_id: 'card-a', balance_remaining: 2500, status: 'active' },
    ];

    const result = calculateCardSpending(cardA, transactions, loans);
    // directSpend must only include regular expenses, NOT loan-linked expenses
    expect(result.directSpend).toBe(5000);
    expect(result.loansSpend).toBe(12500);
    expect(result.totalUsed).toBe(17500); // 5000 + 12500, NOT 5000 + 10000 + 2500 + 12500
    expect(result.availableToSpend).toBe(32500); // 50000 - 17500
  });

  it('ignores paid loans in loansSpend', () => {
    const loans = [
      { id: 'loan-1', credit_card_id: 'card-a', balance_remaining: 0, status: 'paid' },
      { id: 'loan-2', credit_card_id: 'card-a', balance_remaining: 5000, status: 'active' },
      { id: 'loan-3', credit_card_id: 'card-b', balance_remaining: 20000, status: 'active' },
    ];

    const result = calculateCardSpending(cardA, [], loans);
    expect(result.loansSpend).toBe(5000);
    expect(result.totalUsed).toBe(5000);
    expect(result.availableToSpend).toBe(45000);
  });

  it('clamps available spending to 0 when over limit', () => {
    const transactions = [
      { id: '1', credit_card_id: 'card-a', kind: 'expense', amount: 60000, loan_id: null },
    ];

    const result = calculateCardSpending(cardA, transactions, []);
    expect(result.totalUsed).toBe(60000);
    expect(result.availableToSpend).toBe(0);
    expect(result.utilizationPercent).toBe(100);
  });

  it('handles empty data and cards with 0 credit limit safely', () => {
    const cardZero = { id: 'card-zero', credit_limit: 0 };
    const result = calculateCardSpending(cardZero, [], []);
    expect(result.directSpend).toBe(0);
    expect(result.loansSpend).toBe(0);
    expect(result.totalUsed).toBe(0);
    expect(result.availableToSpend).toBe(0);
    expect(result.utilizationPercent).toBe(0);
  });

  it('handles pre-filtered arrays where credit_card_id is omitted', () => {
    const preFilteredTx = [
      { kind: 'expense', amount: 2000, loan_id: null },
      { kind: 'expense', amount: 1500, loan_id: null },
    ];
    const preFilteredLoans = [
      { balance_remaining: 3500, status: 'active' },
    ];

    const result = calculateCardSpending(cardA, preFilteredTx as any, preFilteredLoans as any);
    expect(result.directSpend).toBe(3500);
    expect(result.loansSpend).toBe(3500);
    expect(result.totalUsed).toBe(7000);
    expect(result.availableToSpend).toBe(43000);
  });

  it('deducts card-linked mortgages and debt liabilities from available credit limit', () => {
    // Card with ₱100,000 credit limit
    const card = { id: 'card-c', credit_limit: 100000 };
    const transactions = [
      { id: '1', credit_card_id: 'card-c', kind: 'expense', amount: 10000, loan_id: null },
    ];
    // Active Credit2Cash loan on card with ₱60,000 remaining principal
    const liabilities = [
      { id: 'lib-1', credit_card_id: 'card-c', current_principal_balance: 60000, status: 'active' },
      { id: 'lib-2', credit_card_id: 'card-c', current_principal_balance: 0, status: 'paid_off' },
      { id: 'lib-3', credit_card_id: 'other-card', current_principal_balance: 20000, status: 'active' },
    ];

    const result = calculateCardSpending(card, transactions, [], liabilities);
    expect(result.directSpend).toBe(10000);
    expect(result.loansSpend).toBe(60000); // Only active liability on this card
    expect(result.totalUsed).toBe(70000); // 10000 + 60000
    expect(result.availableToSpend).toBe(30000); // 100000 - 70000
    expect(result.utilizationPercent).toBe(70); // 70% utilization
  });

  it('aggregates both p2p loans and mortgage liabilities linked to the same card', () => {
    const card = { id: 'card-d', credit_limit: 200000 };
    const p2pLoans = [
      { id: 'p2p-1', credit_card_id: 'card-d', balance_remaining: 25000, status: 'active' },
    ];
    const liabilities = [
      { id: 'lib-1', credit_card_id: 'card-d', current_principal_balance: 75000, status: 'active' },
    ];

    const result = calculateCardSpending(card, [], p2pLoans, liabilities);
    expect(result.loansSpend).toBe(100000); // 25000 + 75000
    expect(result.totalUsed).toBe(100000);
    expect(result.availableToSpend).toBe(100000); // 200000 - 100000
    expect(result.utilizationPercent).toBe(50);
  });

  it('deducts credit_card_installment liability from available credit limit', () => {
    const card = { id: 'card-inst', credit_limit: 150000 };
    const transactions = [
      { id: '1', credit_card_id: 'card-inst', kind: 'expense', amount: 15000, loan_id: null },
    ];
    // Active 0% installment for ₱72,000 purchase
    const liabilities = [
      {
        id: 'inst-1',
        credit_card_id: 'card-inst',
        liability_type: 'credit_card_installment',
        current_principal_balance: 72000,
        status: 'active',
      },
    ];

    const result = calculateCardSpending(card, transactions, [], liabilities);
    expect(result.directSpend).toBe(15000);
    expect(result.loansSpend).toBe(72000);
    expect(result.totalUsed).toBe(87000); // 15000 + 72000
    expect(result.availableToSpend).toBe(63000); // 150000 - 87000
    expect(result.utilizationPercent).toBe(58); // 87000 / 150000 = 58%
  });

  it('generates 0% installment promo schedule with zero interest charges across all terms', () => {
    // 60,000 principal at 0% add-on for 12 months with Day 27 card due date
    const summary = calculateAmortizationSchedule({
      principal: 60000,
      annualInterestRate: 0,
      rateType: 'monthly_addon',
      interestRate: 0,
      termMonths: 12,
      startDate: '2026-10-05',
      monthlyDueDay: 27,
    });

    expect(summary.schedule.length).toBe(12);
    expect(summary.totalPrincipal).toBe(60000);
    expect(summary.totalInterest).toBe(0);
    expect(summary.totalPayment).toBe(60000);
    expect(summary.monthlyPayment).toBe(5000);

    // Verify first installment
    const firstRow = summary.schedule[0];
    expect(firstRow.installmentNumber).toBe(1);
    expect(firstRow.dueDate).toBe('2026-10-27');
    expect(firstRow.paymentAmount).toBe(5000);
    expect(firstRow.principalAmount).toBe(5000);
    expect(firstRow.interestAmount).toBe(0);
    expect(firstRow.remainingBalance).toBe(55000);

    // Verify final installment
    const finalRow = summary.schedule[11];
    expect(finalRow.installmentNumber).toBe(12);
    expect(finalRow.dueDate).toBe('2027-09-27');
    expect(finalRow.remainingBalance).toBe(0);
  });
});


