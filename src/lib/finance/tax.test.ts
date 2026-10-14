import { describe, it, expect } from 'vitest';
import {
  calculateCapitalGains,
  computeRentalBusinessTaxSummary,
} from './tax';

describe('Capital Gains & Automated Tax Preparation Engine (Task 4.4)', () => {
  it('calculates real estate Capital Gains Tax under BIR 6% Final Tax rule', () => {
    const propertySale = calculateCapitalGains({
      assetName: 'Quezon City Condominium Unit 4B',
      assetType: 'real_estate',
      purchasePrice: 3200000,
      purchaseDate: '2021-03-15',
      sellingPrice: 4800000,
      sellingDate: '2026-05-10',
      sellingExpenses: 150000,
      fairMarketValueAtSale: 4500000,
    });

    // Gross gain = 4,800,000 - 150,000 - 3,200,000 = 1,450,000
    expect(propertySale.grossGainOrLoss).toBe(1450000);
    expect(propertySale.isGain).toBe(true);
    expect(propertySale.isLongTerm).toBe(true);

    // BIR Sec 24(D)(1): 6% on higher of selling price (4.8M) or zonal value (4.5M)
    // 4,800,000 * 0.06 = 288,000
    expect(propertySale.estimatedCapitalGainsTax).toBe(288000);
    expect(propertySale.taxRuleApplied).toContain('BIR Sec 24(D)(1) 6% Final Capital Gains Tax');
  });

  it('classifies short-term vs. long-term holding periods for ordinary capital assets', () => {
    // Short term (< 365 days)
    const shortTermVehicle = calculateCapitalGains({
      assetName: 'Commercial Delivery Van',
      assetType: 'vehicle',
      purchasePrice: 600000,
      purchaseDate: '2026-01-10',
      sellingPrice: 700000,
      sellingDate: '2026-06-15',
    });
    expect(shortTermVehicle.isLongTerm).toBe(false);
    expect(shortTermVehicle.grossGainOrLoss).toBe(100000);
    // 100% inclusion at 20% = 20,000
    expect(shortTermVehicle.estimatedCapitalGainsTax).toBe(20000);

    // Long term (>= 365 days)
    const longTermVehicle = calculateCapitalGains({
      assetName: 'Executive Sedan',
      assetType: 'vehicle',
      purchasePrice: 800000,
      purchaseDate: '2023-01-10',
      sellingPrice: 900000,
      sellingDate: '2026-06-15',
    });
    expect(longTermVehicle.isLongTerm).toBe(true);
    // 50% inclusion at 20% = 10,000
    expect(longTermVehicle.estimatedCapitalGainsTax).toBe(10000);
  });

  it('computes rental business tax summary with strict separation of interest and principal', () => {
    const summary = computeRentalBusinessTaxSummary({
      taxYear: 2026,
      grossRentalOrBoundaryIncome: 600000,
      operatingExpenses: 120000, // Fuel, maintenance
      annualInsurancePaid: 25000,
      loanInterestPaid: 45000, // Deductible
      loanPrincipalPaid: 155000, // Non-deductible
      annualDepreciation: 80000, // Deductible
    });

    // Total deductions = 120k + 25k + 45k + 80k = 270,000
    expect(summary.allowableDeductions.totalDeductions).toBe(270000);
    // Net taxable income = 600k - 270k = 330,000
    expect(summary.netTaxableIncome).toBe(330000);
    // Non-deductible principal repayment recorded separately
    expect(summary.nonDeductibleItems.loanPrincipalRepayment).toBe(155000);
    // Estimated tax due at 20% small business rate = 330,000 * 0.20 = 66,000
    expect(summary.estimatedTaxDue).toBe(66000);
  });
});
