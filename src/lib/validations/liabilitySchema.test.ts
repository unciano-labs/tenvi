import { describe, it, expect } from 'vitest';
import { liabilitySchema, updateLiabilitySchema, cardInstallmentSchema } from './schemas';

describe('liabilitySchema validation - Account Linking, Rate Types & Amortization Override', () => {
  it('validates liability linked to a credit card with monthly add-on rate', () => {
    const cardId = '123e4567-e89b-12d3-a456-426614174000';
    const propId = '223e4567-e89b-12d3-a456-426614174000';

    const data = {
      name: 'EW Credit2Cash Loan',
      lenderName: 'EastWest Bank',
      liabilityType: 'auto_loan',
      originalPrincipal: 700000,
      currentPrincipalBalance: 650000,
      interestRateType: 'monthly_addon',
      interestRate: 0.55,
      termMonths: 60,
      monthlyPayment: 15516.67,
      isAmortizationOverridden: true,
      dueDay: 22,
      startDate: '2026-08-04',
      propertyId: propId,
      linkedAccountType: 'credit_card',
      creditCardId: cardId,
      status: 'active',
      notes: 'EastWest Visa cash conversion',
    };

    const res = liabilitySchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.interestRateType).toBe('monthly_addon');
      expect(res.data.interestRate).toBe(0.55);
      expect(res.data.isAmortizationOverridden).toBe(true);
      expect(res.data.linkedAccountType).toBe('credit_card');
      expect(res.data.creditCardId).toBe(cardId);
      expect(res.data.dueDay).toBe(22);
    }
  });

  it('validates liability linked to a savings account with standard annual rate', () => {
    const savingsId = '323e4567-e89b-12d3-a456-426614174000';

    const data = {
      name: 'BPI Condominium Mortgage',
      lenderName: 'BPI Family Savings',
      liabilityType: 'mortgage',
      originalPrincipal: 3500000,
      currentPrincipalBalance: 3200000,
      interestRateType: 'annual',
      interestRate: 6.75,
      termMonths: 240,
      monthlyPayment: 26612.44,
      isAmortizationOverridden: false,
      dueDay: 15,
      startDate: '2026-01-15',
      linkedAccountType: 'savings',
      savingsId: savingsId,
      status: 'active',
    };

    const res = liabilitySchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.interestRateType).toBe('annual');
      expect(res.data.interestRate).toBe(6.75);
      expect(res.data.isAmortizationOverridden).toBe(false);
      expect(res.data.linkedAccountType).toBe('savings');
      expect(res.data.savingsId).toBe(savingsId);
    }
  });

  it('validates unlinked liability with empty strings for optional references', () => {
    const data = {
      name: 'Personal Standalone Debt',
      lenderName: 'Private Lender',
      liabilityType: 'personal_loan',
      originalPrincipal: 100000,
      currentPrincipalBalance: 100000,
      interestRateType: 'annual',
      interestRate: 0,
      termMonths: 12,
      monthlyPayment: 8333.33,
      propertyId: '',
      linkedAccountType: '',
      creditCardId: '',
      savingsId: '',
    };

    const res = liabilitySchema.safeParse(data);
    expect(res.success).toBe(true);
  });

  it('validates updateLiabilitySchema with valid liabilityId', () => {
    const libId = '423e4567-e89b-12d3-a456-426614174000';
    const data = {
      liabilityId: libId,
      name: 'Updated Mortgage',
      lenderName: 'Metrobank',
      liabilityType: 'mortgage',
      originalPrincipal: 2000000,
      currentPrincipalBalance: 1800000,
      interestRateType: 'annual',
      interestRate: 5.5,
      monthlyPayment: 18000,
    };

    const res = updateLiabilitySchema.safeParse(data);
    expect(res.success).toBe(true);
  });

  it('validates liability with credit_card_installment liabilityType', () => {
    const cardId = '123e4567-e89b-12d3-a456-426614174000';
    const data = {
      name: 'Power Mac Center - iPhone 16 Pro',
      lenderName: 'BPI Platinum Rewards',
      liabilityType: 'credit_card_installment',
      originalPrincipal: 72000,
      currentPrincipalBalance: 72000,
      interestRateType: 'monthly_addon',
      interestRate: 0,
      termMonths: 24,
      monthlyPayment: 3000,
      creditCardId: cardId,
      linkedAccountType: 'credit_card',
      dueDay: 27,
      startDate: '2026-10-16',
      firstPaymentDate: '2026-11-27',
      status: 'active',
    };

    const res = liabilitySchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.liabilityType).toBe('credit_card_installment');
      expect(res.data.interestRate).toBe(0);
      expect(res.data.monthlyPayment).toBe(3000);
    }
  });
});

describe('cardInstallmentSchema validation', () => {
  it('validates a standard 0% installment transaction promo', () => {
    const cardId = '123e4567-e89b-12d3-a456-426614174000';
    const data = {
      creditCardId: cardId,
      merchantName: 'Abenson (Carrier Inverter AC)',
      principal: 48000,
      termMonths: 12,
      monthlyAddonRate: 0,
      transactionDate: '2026-10-16',
      firstBillingMonth: '',
      monthlyAmortization: 4000,
      isAmortizationOverridden: false,
    };

    const res = cardInstallmentSchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.principal).toBe(48000);
      expect(res.data.monthlyAddonRate).toBe(0);
      expect(res.data.monthlyAmortization).toBe(4000);
    }
  });

  it('validates an installment with monthly add-on rate and BNPL first billing month', () => {
    const cardId = '123e4567-e89b-12d3-a456-426614174000';
    const data = {
      creditCardId: cardId,
      merchantName: 'Metrobank Cash2Go',
      principal: 100000,
      termMonths: 24,
      monthlyAddonRate: 0.55,
      transactionDate: '2026-10-16',
      firstBillingMonth: '2026-12',
      monthlyAmortization: 4716.67,
      isAmortizationOverridden: true,
      notes: 'Promo code CASH2GO2026',
    };

    const res = cardInstallmentSchema.safeParse(data);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.monthlyAddonRate).toBe(0.55);
      expect(res.data.firstBillingMonth).toBe('2026-12');
      expect(res.data.isAmortizationOverridden).toBe(true);
    }
  });
});
