import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { calculateTrueNetWorth } from '@/lib/finance/calculations';

export async function GET(request: Request) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const user = auth.user;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') === 'json' ? 'json' : 'csv';

  const supabase = await createClient();

  const [
    { data: savings },
    { data: loans },
    { data: properties },
    { data: creditCards },
    { data: statements },
    { data: liabilities },
  ] = await Promise.all([
    supabase
      .from('bili_savings')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('bili_loans')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('bili_properties')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null),
    supabase
      .from('bili_credit_cards')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .is('deleted_at', null),
    supabase
      .from('bili_card_statements')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .order('cycle_end', { ascending: false }),
    supabase
      .from('bili_liabilities')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null),
  ]);

  const statementsByCard = new Map<string, any>();
  (statements || []).forEach((st) => {
    if (!statementsByCard.has(st.credit_card_id)) {
      statementsByCard.set(st.credit_card_id, st);
    }
  });

  const cardsWithStatements = (creditCards || []).map((c) => ({
    ...c,
    latest_statement: statementsByCard.get(c.id) || null,
  }));

  const netWorthSummary = calculateTrueNetWorth({
    savings: savings || [],
    loans: loans || [],
    properties: properties || [],
    creditCards: cardsWithStatements,
    liabilities: liabilities || [],
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const exportPayload = {
    statementDate: todayStr,
    userId: user.id,
    netWorth: netWorthSummary.netWorth,
    totalAssets: netWorthSummary.totalAssets,
    totalLiabilities: netWorthSummary.totalLiabilities,
    debtToAssetRatioPercent: netWorthSummary.debtToAssetRatio,
    assetsBreakdown: {
      liquidSavings: {
        total: netWorthSummary.liquidSavings,
        accounts: savings || [],
      },
      receivables: {
        total: netWorthSummary.receivables,
        loans: loans || [],
      },
      fixedAssets: {
        total: netWorthSummary.fixedAssets,
        properties: properties || [],
      },
    },
    liabilitiesBreakdown: {
      creditCardBalances: {
        total: netWorthSummary.creditCardBalances,
        cards: cardsWithStatements,
      },
      longTermDebt: {
        total: netWorthSummary.longTermLiabilities,
        liabilities: liabilities || [],
      },
    },
  };

  if (format === 'json') {
    return new Response(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="tenvi_balance_sheet_${todayStr}.json"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  // Generate CSV balance sheet summary
  const lines = [
    `TENVI COMMERCIAL BALANCE SHEET & NET WORTH STATEMENT`,
    `Generated As Of,${todayStr}`,
    `User ID,${user.id}`,
    ``,
    `SECTION,LINE ITEM,CATEGORY,AMOUNT (PHP)`,
    `ASSETS,Liquid Cash & Bank Accounts,Liquid Assets,${netWorthSummary.liquidSavings.toFixed(2)}`,
    ...(savings || []).map(
      (s) => `ASSETS,"${s.name} (${s.bank_name || 'Bank'})",Liquid Bank Account,${Number(s.current_balance || 0).toFixed(2)}`
    ),
    `ASSETS,Loan Receivables Owed to You,Receivables,${netWorthSummary.receivables.toFixed(2)}`,
    ...(loans || [])
      .filter((l) => l.status !== 'paid')
      .map(
        (l) => `ASSETS,"${l.reason || 'Loan Receivable'}",Account Receivable,${Number(l.balance_remaining || 0).toFixed(2)}`
      ),
    `ASSETS,Fixed Assets & Properties,Fixed Assets,${netWorthSummary.fixedAssets.toFixed(2)}`,
    ...(properties || []).map(
      (p) => `ASSETS,"${p.name} (${p.property_type})",Real Estate / Property,${Number(p.estimated_value || 0).toFixed(2)}`
    ),
    `TOTAL ASSETS,All Consolidated Assets,Summary,${netWorthSummary.totalAssets.toFixed(2)}`,
    ``,
    `LIABILITIES,Credit Card Balances,Revolving Debt,${netWorthSummary.creditCardBalances.toFixed(2)}`,
    ...cardsWithStatements.map((c) => {
      const unpaid = c.latest_statement
        ? Math.max(0, Number(c.latest_statement.billed_amount || 0) - Number(c.latest_statement.paid_amount || 0))
        : 0;
      return `LIABILITIES,"${c.bank_name} ${c.name} (••••${c.last_4})",Credit Card Balance,${unpaid.toFixed(2)}`;
    }),
    `LIABILITIES,Long-Term Debt & Mortgages,Term Liabilities,${netWorthSummary.longTermLiabilities.toFixed(2)}`,
    ...(liabilities || [])
      .filter((l) => l.status === 'active')
      .map(
        (l) => `LIABILITIES,"${l.name} (${l.lender_name})",Mortgage / Loan,${Number(l.current_principal_balance || 0).toFixed(2)}`
      ),
    `TOTAL LIABILITIES,All Consolidated Liabilities,Summary,${netWorthSummary.totalLiabilities.toFixed(2)}`,
    ``,
    `EQUITY & NET WORTH,True Commercial Net Worth,Net Equity,${netWorthSummary.netWorth.toFixed(2)}`,
    `EQUITY & NET WORTH,Debt-to-Asset Ratio,Solvency Percentage,${netWorthSummary.debtToAssetRatio}%`,
  ];

  const csvContent = lines.join('\r\n');

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tenvi_balance_sheet_${todayStr}.csv"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
