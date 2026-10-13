import { describe, it, expect } from 'vitest';
import { analyzeRagIntent } from './ragRetriever';
import { UserFinancialContext } from './financialContext';

describe('analyzeRagIntent', () => {
  it('handles bank names and card names with parentheses without regex syntax errors', () => {
    const mockContext: UserFinancialContext = {
      creditCards: [
        {
          id: 'card-1',
          name: 'Security Bank (Wave Mastercard)',
          bank_name: '(Bank of Commerce)',
          statement_day: 15,
          payment_due_day: 5,
        } as any,
        {
          id: 'card-2',
          name: 'BDO (ShopMore Credit Card)',
          bank_name: 'BDO (Unibank)',
          statement_day: 20,
          payment_due_day: 10,
        } as any,
      ],
      properties: [],
      categories: [],
      todayISO: '2026-10-09',
    } as any;

    expect(() => {
      const intent = analyzeRagIntent('How much did I spend on my Wave card?', mockContext);
      expect(intent.creditCardId).toBe('card-1');
    }).not.toThrow();

    expect(() => {
      const intent = analyzeRagIntent('How much did I spend on BDO?', mockContext);
      expect(intent.creditCardId).toBe('card-2');
    }).not.toThrow();
  });
});
