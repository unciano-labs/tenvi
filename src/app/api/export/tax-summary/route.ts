import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { computeRentalBusinessTaxSummary, calculateCapitalGains } from '@/lib/finance/tax';
import { calculateStraightLineDepreciation } from '@/lib/finance/calculations';

export async function GET(request: Request) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const user = auth.user;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') === 'json' ? 'json' : 'csv';
  const taxYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

  const supabase = await createClient();

  // Fetch properties, liabilities, transactions, and manual tax records
  const [
    { data: properties },
    { data: liabilities },
    { data: transactions },
    { data: taxRecords },
  ] = await Promise.all([
    supabase
      .from('bili_properties')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('bili_liabilities')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('bili_transactions')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .gte('occurred_on', `${taxYear}-01-01`)
      .lte('occurred_on', `${taxYear}-12-31`)
      .is('deleted_at', null),
    supabase
      .from('bili_tax_records')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .eq('tax_year', taxYear),
  ]);

  // 1. Calculate business rental / fleet gross income & expenses
  const rentalIncome = (transactions || [])
    .filter((t) => t.kind === 'income' && t.property_id)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const propertyExpenses = (transactions || [])
    .filter((t) => t.kind === 'expense' && t.property_id)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalInsurance = (properties || []).reduce(
    (sum, p) => sum + Number(p.annual_insurance_amount || 0),
    0
  );

  // 2. Estimate annual interest paid vs principal on liabilities
  let annualInterest = 0;
  let annualPrincipal = 0;
  (liabilities || []).forEach((l) => {
    const pmt = Number(l.monthly_payment || 0);
    const balance = Number(l.current_principal_balance || 0);
    const rate = Number(l.annual_interest_rate || 0);
    const estMonthlyInterest = (balance * (rate / 100)) / 12;
    const estMonthlyPrincipal = Math.max(0, pmt - estMonthlyInterest);
    annualInterest += estMonthlyInterest * 12;
    annualPrincipal += estMonthlyPrincipal * 12;
  });

  // 3. Compute annual depreciation across properties and vehicles
  let annualDepreciation = 0;
  (properties || []).forEach((p) => {
    if (p.purchase_price && p.purchase_date) {
      const depr = calculateStraightLineDepreciation({
        purchasePrice: Number(p.purchase_price),
        purchaseDate: p.purchase_date,
      });
      annualDepreciation += depr.monthlyDepreciation * 12;
    }
  });

  const rentalTaxSummary = computeRentalBusinessTaxSummary({
    taxYear,
    grossRentalOrBoundaryIncome: rentalIncome,
    operatingExpenses: propertyExpenses,
    annualInsurancePaid: totalInsurance,
    loanInterestPaid: annualInterest,
    loanPrincipalPaid: annualPrincipal,
    annualDepreciation,
  });

  // 4. Asset Capital Gains
  const soldAssets = (properties || []).filter((p) => p.status === 'sold');
  const capitalGainsList = soldAssets.map((p) =>
    calculateCapitalGains({
      assetName: p.name,
      assetType: p.property_type === 'vehicle' ? 'vehicle' : 'real_estate',
      purchasePrice: Number(p.purchase_price || p.estimated_value || 0),
      purchaseDate: p.purchase_date || '2020-01-01',
      sellingPrice: Number(p.estimated_value || 0),
      sellingDate: `${taxYear}-06-30`,
    })
  );

  const exportPayload = {
    taxYear,
    generatedDate: new Date().toISOString().split('T')[0],
    userId: user.id,
    businessRentalSummary: rentalTaxSummary,
    capitalGains: capitalGainsList,
    recordedTaxEntries: taxRecords || [],
  };

  if (format === 'json') {
    return new Response(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="tenvi_tax_summary_${taxYear}.json"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  // Generate CSV tax schedule
  const lines = [
    `TENVI COMMERCIAL TAX PREPARATION & DEDUCTIONS SCHEDULE`,
    `Tax Year,${taxYear}`,
    `Generated As Of,${new Date().toISOString().split('T')[0]}`,
    `User ID,${user.id}`,
    ``,
    `SECTION,LINE ITEM,CLASSIFICATION,AMOUNT (PHP)`,
    `RENTAL & FLEET INCOME,Gross Inflows (Rent / Boundary),Gross Income,${rentalTaxSummary.grossIncome.toFixed(2)}`,
    `ALLOWABLE DEDUCTIONS,Operating Expenses (Fuel/Repairs),Deductible Operating,${rentalTaxSummary.allowableDeductions.operatingExpenses.toFixed(2)}`,
    `ALLOWABLE DEDUCTIONS,Annual Insurance Premiums,Deductible Premium,${rentalTaxSummary.allowableDeductions.annualInsurance.toFixed(2)}`,
    `ALLOWABLE DEDUCTIONS,Deductible Loan Interest Expense,Financing Cost,${rentalTaxSummary.allowableDeductions.loanInterest.toFixed(2)}`,
    `ALLOWABLE DEDUCTIONS,Annual Asset Depreciation Expense,Non-Cash Deduction,${rentalTaxSummary.allowableDeductions.depreciation.toFixed(2)}`,
    `TOTAL DEDUCTIONS,Total Allowable Business Deductions,Total Deductions,${rentalTaxSummary.allowableDeductions.totalDeductions.toFixed(2)}`,
    ``,
    `NON-DEDUCTIBLE,Loan Principal Repayment,Balance Reduction (Not Deductible),${rentalTaxSummary.nonDeductibleItems.loanPrincipalRepayment.toFixed(2)}`,
    ``,
    `TAX SUMMARY,Net Taxable Operating Income,Tax Base,${rentalTaxSummary.netTaxableIncome.toFixed(2)}`,
    `TAX SUMMARY,Estimated Income Tax Obligation (20%),Estimated Tax Due,${rentalTaxSummary.estimatedTaxDue.toFixed(2)}`,
    `TAX SUMMARY,Effective Operating Profit Margin,Margin %,${rentalTaxSummary.effectiveProfitMargin}%`,
    ``,
    `CAPITAL GAINS & ASSET SALES,ASSET NAME,HOLDING PERIOD,GROSS GAIN/LOSS,ESTIMATED CGT`,
    ...capitalGainsList.map(
      (cg) =>
        `CAPITAL GAINS,"${cg.assetName}",${cg.isLongTerm ? 'Long-Term (>=1yr)' : 'Short-Term'},${cg.grossGainOrLoss.toFixed(2)},${cg.estimatedCapitalGainsTax.toFixed(2)}`
    ),
  ];

  return new Response(lines.join('\r\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tenvi_tax_summary_${taxYear}.csv"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
