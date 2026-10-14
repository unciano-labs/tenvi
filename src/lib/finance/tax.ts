/**
 * Commercial FinTech Capital Gains & Automated Tax Preparation Engine
 * Handles capital gains tax (CGT), short-term vs. long-term holding period classification,
 * deductible interest vs. non-deductible principal, depreciation deductions, and tax schedule generation.
 */

export interface CapitalGainsInput {
  assetName: string;
  assetType: 'real_estate' | 'vehicle' | 'equipment' | 'shares' | 'other';
  purchasePrice: number;
  purchaseDate: string | Date;
  sellingPrice: number;
  sellingDate: string | Date;
  sellingExpenses?: number;
  fairMarketValueAtSale?: number;
}

export interface CapitalGainsResult {
  assetName: string;
  assetType: string;
  costBasis: number;
  sellingPrice: number;
  sellingExpenses: number;
  netProceeds: number;
  grossGainOrLoss: number;
  isGain: boolean;
  holdingPeriodDays: number;
  isLongTerm: boolean; // >= 365 days
  estimatedCapitalGainsTax: number;
  taxRuleApplied: string;
}

/**
 * Calculates capital gains or losses and estimated tax obligation
 * Incorporates standard BIR (Bureau of Internal Revenue) Form 1706 6% Final Withholding Tax
 * for Philippine real property vs. standard capital assets.
 */
export function calculateCapitalGains(input: CapitalGainsInput): CapitalGainsResult {
  const cost = Math.max(0, Number(input.purchasePrice || 0));
  const sellingPrice = Math.max(0, Number(input.sellingPrice || 0));
  const sellingExpenses = Math.max(0, Number(input.sellingExpenses || 0));
  const netProceeds = Number(Math.max(0, sellingPrice - sellingExpenses).toFixed(2));
  const grossGainOrLoss = Number((netProceeds - cost).toFixed(2));
  const isGain = grossGainOrLoss > 0;

  const pDate = new Date(input.purchaseDate);
  const sDate = new Date(input.sellingDate);
  let holdingPeriodDays = 0;
  if (!isNaN(pDate.getTime()) && !isNaN(sDate.getTime()) && sDate >= pDate) {
    holdingPeriodDays = Math.round((sDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  const isLongTerm = holdingPeriodDays >= 365;

  let estimatedCapitalGainsTax = 0;
  let taxRuleApplied = '';

  if (input.assetType === 'real_estate') {
    // Under BIR Section 24(D)(1), Capital Gains Tax on real estate is 6% of the gross selling price
    // or fair market / zonal value, whichever is higher
    const taxableBase = Math.max(sellingPrice, Number(input.fairMarketValueAtSale || 0));
    estimatedCapitalGainsTax = Number((taxableBase * 0.06).toFixed(2));
    taxRuleApplied = 'BIR Sec 24(D)(1) 6% Final Capital Gains Tax on Gross/FMV';
  } else {
    // Standard capital asset: taxed only if there is a net gain
    if (isGain) {
      if (isLongTerm) {
        // Long-term holding period: preferential 50% inclusion rule or 15% rate
        estimatedCapitalGainsTax = Number((grossGainOrLoss * 0.5 * 0.2).toFixed(2)); // ~10% effective
        taxRuleApplied = 'Long-term capital asset (50% holding period exclusion, 20% bracket)';
      } else {
        // Short-term: 100% inclusion in ordinary income (standard 20% base bracket)
        estimatedCapitalGainsTax = Number((grossGainOrLoss * 0.2).toFixed(2));
        taxRuleApplied = 'Short-term capital asset (100% ordinary income inclusion, 20% bracket)';
      }
    } else {
      estimatedCapitalGainsTax = 0;
      taxRuleApplied = 'Capital loss (no tax due; allowable loss carry-forward)';
    }
  }

  return {
    assetName: input.assetName,
    assetType: input.assetType,
    costBasis: cost,
    sellingPrice,
    sellingExpenses,
    netProceeds,
    grossGainOrLoss,
    isGain,
    holdingPeriodDays,
    isLongTerm,
    estimatedCapitalGainsTax,
    taxRuleApplied,
  };
}

export interface BusinessRentalTaxSummaryInput {
  taxYear: number;
  grossRentalOrBoundaryIncome: number;
  operatingExpenses: number; // Fuel, maintenance, repairs, management fees
  annualInsurancePaid: number;
  loanInterestPaid: number; // Deductible financing cost
  loanPrincipalPaid: number; // Non-deductible balance reduction
  annualDepreciation: number; // Depreciation expense
}

export interface BusinessRentalTaxSummaryResult {
  taxYear: number;
  grossIncome: number;
  allowableDeductions: {
    operatingExpenses: number;
    annualInsurance: number;
    loanInterest: number;
    depreciation: number;
    totalDeductions: number;
  };
  nonDeductibleItems: {
    loanPrincipalRepayment: number;
  };
  netTaxableIncome: number;
  effectiveProfitMargin: number;
  estimatedTaxDue: number; // Based on 20% small business / graduated rate
}

/**
 * Computes taxable income and allowable deductions for income-generating units
 * Strictly distinguishes deductible interest from non-deductible loan principal.
 */
export function computeRentalBusinessTaxSummary(
  input: BusinessRentalTaxSummaryInput
): BusinessRentalTaxSummaryResult {
  const gross = Math.max(0, Number(input.grossRentalOrBoundaryIncome || 0));
  const opEx = Math.max(0, Number(input.operatingExpenses || 0));
  const insurance = Math.max(0, Number(input.annualInsurancePaid || 0));
  const interest = Math.max(0, Number(input.loanInterestPaid || 0));
  const depr = Math.max(0, Number(input.annualDepreciation || 0));
  const principal = Math.max(0, Number(input.loanPrincipalPaid || 0));

  const totalDeductions = Number((opEx + insurance + interest + depr).toFixed(2));
  const netTaxableIncome = Number(Math.max(0, gross - totalDeductions).toFixed(2));
  const estimatedTaxDue = Number((netTaxableIncome * 0.2).toFixed(2));
  const effectiveProfitMargin = gross > 0 ? Number(((netTaxableIncome / gross) * 100).toFixed(1)) : 0;

  return {
    taxYear: input.taxYear,
    grossIncome: Number(gross.toFixed(2)),
    allowableDeductions: {
      operatingExpenses: opEx,
      annualInsurance: insurance,
      loanInterest: interest,
      depreciation: depr,
      totalDeductions,
    },
    nonDeductibleItems: {
      loanPrincipalRepayment: principal,
    },
    netTaxableIncome,
    effectiveProfitMargin,
    estimatedTaxDue,
  };
}
