import { describe, it, expect } from 'vitest';
import { normalizeDate, matchCategoryForMerchant } from '@/lib/ai/statementParser';
import { transactionSchema } from '@/lib/validations/schemas';

describe('Multi-transaction Receipt & Image Parsing Logic', () => {
  const currentYear = 2026;

  describe('normalizeDate', () => {
    it('normalizes standard YYYY-MM-DD date strings', () => {
      const { isoDate } = normalizeDate('2026-11-04', currentYear);
      expect(isoDate).toBe('2026-11-04');
    });

    it('normalizes MM/DD/YYYY format', () => {
      const { isoDate } = normalizeDate('11/04/2026', currentYear);
      expect(isoDate).toBe('2026-11-04');
    });

    it('defaults missing year to currentYear', () => {
      const { isoDate } = normalizeDate('Nov 04', currentYear);
      expect(isoDate).toBe('2026-11-04');
    });

    it('handles empty date string without crashing', () => {
      const { isoDate } = normalizeDate('', currentYear);
      expect(isoDate).toBeDefined();
    });
  });

  describe('matchCategoryForMerchant', () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Food & Dining', kind: 'expense' },
      { id: 'cat-2', name: 'Transportation & Gas', kind: 'expense' },
      { id: 'cat-3', name: 'Other Expense', kind: 'expense' },
    ];

    it('matches Jollibee or restaurant purchases to Food & Dining', () => {
      const { categoryId, categoryName } = matchCategoryForMerchant(
        'Jollibee Burger Steak Dining Out',
        mockCategories as any
      );
      expect(categoryId).toBe('cat-1');
      expect(categoryName).toBe('Food & Dining');
    });

    it('matches Shell or Caltex purchases to Transportation & Gas', () => {
      const { categoryId, categoryName } = matchCategoryForMerchant(
        'Shell Fuel Gas station',
        mockCategories as any
      );
      expect(categoryId).toBe('cat-2');
      expect(categoryName).toBe('Transportation & Gas');
    });

    it('falls back to Other Expense category when merchant is unknown', () => {
      const { categoryId, categoryName } = matchCategoryForMerchant(
        'XYZ Special Project Alpha',
        mockCategories as any
      );
      expect(categoryId).toBe('cat-3');
      expect(categoryName).toBe('Other Expense');
    });

    it('returns null category when categories list is empty', () => {
      const { categoryId, categoryName } = matchCategoryForMerchant(
        'XYZ Special Project Alpha',
        []
      );
      expect(categoryId).toBeNull();
      expect(categoryName).toBeNull();
    });
  });

  describe('Multi-transaction JSON response extraction helper', () => {
    it('handles { transactions: [...] } response payload with complete and incomplete items', () => {
      const payload = {
        transactions: [
          {
            merchant: 'Jollibee',
            amount: 450.5,
            date: '2026-11-02',
            paymentMethod: 'credit_card',
            itemsSummary: '2pc Chickenjoy',
            suggestedCategory: 'Dining Out',
          },
          {
            merchant: 'Grab Transport',
            amount: 0, // missing amount
            date: '2026-11-03',
            paymentMethod: 'gcash',
            itemsSummary: null,
            suggestedCategory: 'Commute & Gas',
          },
          {
            merchant: '', // missing merchant
            amount: 1200.0,
            date: '', // missing date
            paymentMethod: 'cash',
            itemsSummary: 'Groceries',
            suggestedCategory: 'Food & Groceries',
          },
        ],
      };

      const extracted = payload.transactions.map((tx) => {
        const isComplete =
          tx.amount > 0 &&
          Boolean(tx.date && tx.date.length >= 8) &&
          Boolean(tx.merchant && tx.merchant.trim().length > 0);
        return { ...tx, isComplete };
      });

      expect(extracted).toHaveLength(3);
      expect(extracted[0].isComplete).toBe(true);
      expect(extracted[1].isComplete).toBe(false); // missing amount
      expect(extracted[2].isComplete).toBe(false); // missing merchant & date
    });

    it('validates transactionSchema compliance for batch transactions', () => {
      const validItem = {
        kind: 'expense',
        amount: 450.5,
        categoryId: null,
        paymentMethod: 'credit_card',
        creditCardId: '11111111-1111-1111-1111-111111111111',
        occurredOn: '2026-11-04',
        note: 'Jollibee lunch',
      };

      const parsed = transactionSchema.safeParse(validItem);
      expect(parsed.success).toBe(true);

      const invalidItem = {
        kind: 'expense',
        amount: -10, // negative amount is invalid
        paymentMethod: 'credit_card',
        occurredOn: '2026-11-04',
      };

      const invalidParsed = transactionSchema.safeParse(invalidItem);
      expect(invalidParsed.success).toBe(false);
    });
  });
});
