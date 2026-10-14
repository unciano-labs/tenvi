import { describe, it, expect } from 'vitest';
import { loanSchema } from './schemas';

describe('loanSchema validation - Optional Duration & Monthly Interest', () => {
  it('validates a loan without duration (installmentMonths null) and with monthly interest', () => {
    const data = {
      contactId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 50000,
      reason: 'Business Advance',
      loanedOn: '2026-10-14',
      isInstallment: true,
      installmentMonths: null,
      monthlyDueDay: 15,
      monthlyInterestRate: 3.5,
    };

    const res = loanSchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.installmentMonths).toBeNull();
      expect(res.data.monthlyInterestRate).toBe(3.5);
      expect(res.data.monthlyDueDay).toBe(15);
      expect(res.data.amount).toBe(50000);
    }
  });

  it('validates a loan with empty string duration converting to null', () => {
    const data = {
      contactId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 100000,
      loanedOn: '2026-10-14',
      isInstallment: true,
      installmentMonths: '',
      monthlyDueDay: 20,
      monthlyInterestRate: 5,
    };

    const res = loanSchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.installmentMonths).toBeNull();
      expect(res.data.monthlyInterestRate).toBe(5);
    }
  });

  it('validates a loan with a fixed duration (e.g. 24 months)', () => {
    const data = {
      contactId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 30000,
      loanedOn: '2026-10-14',
      isInstallment: true,
      installmentMonths: 24,
      monthlyDueDay: 15,
      monthlyInterestRate: 1,
    };

    const res = loanSchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.installmentMonths).toBe(24);
      expect(res.data.monthlyInterestRate).toBe(1);
    }
  });
});
