import { describe, it, expect } from 'vitest';
import {
  calculateCardSpending,
  calculateCardLimitImpact,
  calculateSavingsImpact,
  formulateSavingsDeduction,
  applyInstallmentToggleToLiability,
  applyInstallmentToggleToLoan,
} from './accountSync';

describe('accountSync.ts', () => {
  describe('calculateCardLimitImpact() / calculateCardSpending()', () => {
    const card = { id: 'card-1', credit_limit: 100000 };

    it('calculates available credit and total utilized correctly with direct spend only', () => {
      const transactions = [
        { credit_card_id: 'card-1', kind: 'expense', amount: 15000 },
        { credit_card_id: 'card-1', kind: 'expense', amount: 5000 },
        { credit_card_id: 'card-2', kind: 'expense', amount: 9999 }, // other card
      ];

      const result = calculateCardLimitImpact(card, transactions, [], []);
      expect(result.directSpend).toBe(20000);
      expect(result.loansSpend).toBe(0);
      expect(result.totalUsed).toBe(20000);
      expect(result.availableToSpend).toBe(80000);
      expect(result.utilizationPercent).toBe(20);
    });

    it('deducts active linked loan and liability balances from available credit limit', () => {
      const transactions = [
        { credit_card_id: 'card-1', kind: 'expense', amount: 10000 },
      ];
      const loans = [
        { id: 'loan-1', credit_card_id: 'card-1', balance_remaining: 25000, status: 'partial' },
      ];
      const liabilities = [
        { id: 'lib-1', credit_card_id: 'card-1', current_principal_balance: 15000, status: 'active' },
        { id: 'lib-2', credit_card_id: 'card-1', current_principal_balance: 0, status: 'paid_off' }, // paid off, should not deduct
      ];

      const result = calculateCardLimitImpact(card, transactions, loans, liabilities);
      expect(result.directSpend).toBe(10000);
      expect(result.p2pLoansSpend).toBe(25000);
      expect(result.liabilitiesSpend).toBe(15000);
      expect(result.loansSpend).toBe(40000);
      expect(result.totalUsed).toBe(50000);
      expect(result.availableToSpend).toBe(50000);
      expect(result.utilizationPercent).toBe(50);
      expect(result.activeInstallmentsCount).toBe(2);
    });

    it('clamps available credit limit to zero when utilization exceeds credit limit', () => {
      const transactions = [
        { credit_card_id: 'card-1', kind: 'expense', amount: 120000 },
      ];
      const result = calculateCardLimitImpact(card, transactions, [], []);
      expect(result.totalUsed).toBe(120000);
      expect(result.availableToSpend).toBe(0);
      expect(result.utilizationPercent).toBe(100);
    });
  });

  describe('calculateSavingsImpact()', () => {
    const savings = { id: 'sav-1', name: 'Emergency Fund', current_balance: 50000 };

    it('summarizes upcoming monthly amortization outflow and checks sufficiency', () => {
      const liabilities = [
        {
          id: 'mortgage-1',
          name: 'Home Loan',
          savings_id: 'sav-1',
          monthly_payment: 18000,
          current_principal_balance: 1500000,
          status: 'active',
        },
        {
          id: 'car-1',
          name: 'Car Loan',
          savings_id: 'sav-1',
          monthly_payment: 12000,
          current_principal_balance: 400000,
          status: 'active',
        },
        {
          id: 'other-lib',
          name: 'Paid Loan',
          savings_id: 'sav-1',
          monthly_payment: 5000,
          current_principal_balance: 0,
          status: 'paid_off', // paid off, should be excluded
        },
      ];

      const result = calculateSavingsImpact(savings, liabilities, []);
      expect(result.savingsAccountId).toBe('sav-1');
      expect(result.currentBalance).toBe(50000);
      expect(result.totalUpcomingAmortization).toBe(30000);
      expect(result.projectedBalance).toBe(20000);
      expect(result.isSufficient).toBe(true);
      expect(result.shortfallAmount).toBe(0);
      expect(result.upcomingPayments).toHaveLength(2);
    });

    it('identifies shortfall when current balance is insufficient', () => {
      const liabilities = [
        {
          id: 'mortgage-1',
          name: 'Home Loan',
          savings_id: 'sav-1',
          monthly_payment: 60000,
          current_principal_balance: 2000000,
          status: 'active',
        },
      ];

      const result = calculateSavingsImpact(savings, liabilities, []);
      expect(result.isSufficient).toBe(false);
      expect(result.shortfallAmount).toBe(10000); // 60,000 - 50,000
      expect(result.projectedBalance).toBe(-10000);
    });
  });

  describe('formulateSavingsDeduction()', () => {
    const savings = { id: 'sav-1', name: 'Payroll Account', current_balance: 25000 };

    it('succeeds and computes new balance when funds are sufficient', () => {
      const result = formulateSavingsDeduction(savings, 10000);
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(15000);
      expect(result.error).toBeUndefined();
    });

    it('fails and returns helpful error message when funds are insufficient', () => {
      const result = formulateSavingsDeduction(savings, 30000);
      expect(result.success).toBe(false);
      expect(result.newBalance).toBe(25000);
      expect(result.error).toContain('Insufficient balance in Payroll Account');
    });
  });

  describe('applyInstallmentToggleToLiability()', () => {
    const liability = {
      original_principal: 120000,
      current_principal_balance: 120000,
      annual_interest_rate: 0,
      interest_rate_type: 'monthly_addon',
      interest_rate: 0,
      term_months: 12,
      monthly_payment: 10000,
      due_day: 15,
      start_date: '2026-01-15',
      paid_installment_numbers: [1, 2],
    };

    it('adds term number to paid array and updates remaining balance when marking paid', () => {
      const res = applyInstallmentToggleToLiability(liability, 3, true);
      expect(res.updatedPaidNumbers).toEqual([1, 2, 3]);
      expect(res.paidCount).toBe(3);
      expect(res.unpaidCount).toBe(9);
      expect(res.remainingUnpaidBalance).toBe(90000);
      expect(res.newStatus).toBe('active');
    });

    it('removes term number from paid array when marking unpaid', () => {
      const res = applyInstallmentToggleToLiability(liability, 2, false);
      expect(res.updatedPaidNumbers).toEqual([1]);
      expect(res.paidCount).toBe(1);
      expect(res.unpaidCount).toBe(11);
      expect(res.remainingUnpaidBalance).toBe(110000);
      expect(res.newStatus).toBe('active');
    });

    it('transitions status to paid_off when all terms are paid', () => {
      const fullyPaidNumbers = Array.from({ length: 11 }, (_, i) => i + 1); // 1 to 11
      const res = applyInstallmentToggleToLiability(
        { ...liability, paid_installment_numbers: fullyPaidNumbers },
        12,
        true
      );
      expect(res.updatedPaidNumbers).toHaveLength(12);
      expect(res.paidCount).toBe(12);
      expect(res.unpaidCount).toBe(0);
      expect(res.remainingUnpaidBalance).toBe(0);
      expect(res.newStatus).toBe('paid_off');
    });
  });

  describe('applyInstallmentToggleToLoan()', () => {
    const installments = [
      { id: 'inst-1', installment_number: 1, amount: 5000, is_paid: true },
      { id: 'inst-2', installment_number: 2, amount: 5000, is_paid: false },
      { id: 'inst-3', installment_number: 3, amount: 5000, is_paid: false },
    ];

    it('marks installment as paid and updates loan unpaid balance and status', () => {
      const res = applyInstallmentToggleToLoan(installments, 'inst-2', true);
      expect(res.paidCount).toBe(2);
      expect(res.unpaidAmount).toBe(5000);
      expect(res.newStatus).toBe('partial');
    });

    it('marks loan as fully paid when all installments are paid', () => {
      const res = applyInstallmentToggleToLoan(
        [
          { id: 'inst-1', installment_number: 1, amount: 5000, is_paid: true },
          { id: 'inst-2', installment_number: 2, amount: 5000, is_paid: true },
          { id: 'inst-3', installment_number: 3, amount: 5000, is_paid: false },
        ],
        'inst-3',
        true
      );
      expect(res.paidCount).toBe(3);
      expect(res.unpaidAmount).toBe(0);
      expect(res.newStatus).toBe('paid');
    });

    it('handles untoggling a paid installment', () => {
      const res = applyInstallmentToggleToLoan(installments, 'inst-1', false);
      expect(res.paidCount).toBe(0);
      expect(res.unpaidAmount).toBe(15000);
      expect(res.newStatus).toBe('unpaid');
    });
  });
});
