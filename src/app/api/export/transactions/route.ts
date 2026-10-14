import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';

export async function GET(request: Request) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  const user = auth.user;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') === 'json' ? 'json' : 'csv';

  const supabase = await createClient();

  const { data: transactions, error } = await supabase
    .from('bili_transactions')
    .select(`
      id,
      occurred_on,
      kind,
      amount,
      payment_method,
      note,
      created_at,
      category:bili_categories(name),
      credit_card:bili_credit_cards(name, bank_name, last_4),
      savings:savings_id(name),
      transfer_to_savings:transfer_to_savings_id(name),
      property:bili_properties(name)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Export transactions query error:', error);
    return NextResponse.json({ error: 'Failed to retrieve transaction records' }, { status: 500 });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (format === 'json') {
    const jsonBlob = JSON.stringify(transactions || [], null, 2);
    return new Response(jsonBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="tenvi_transactions_${todayStr}.json"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  // Generate CSV format
  const headers = [
    'Date',
    'Transaction ID',
    'Kind',
    'Amount (PHP)',
    'Category',
    'Payment Method',
    'Source Account / Card',
    'Destination Account',
    'Linked Property / Asset',
    'Notes / Description',
  ];

  const escapeCsv = (str: string | null | undefined): string => {
    if (str == null) return '';
    const cleaned = String(str).replace(/"/g, '""');
    return cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')
      ? `"${cleaned}"`
      : cleaned;
  };

  const rows = (transactions || []).map((tx: any) => {
    const cardInfo = tx.credit_card
      ? `${tx.credit_card.bank_name} ${tx.credit_card.name} (••••${tx.credit_card.last_4})`
      : '';
    const sourceAccount = tx.savings?.name || cardInfo || '';
    const destAccount = tx.transfer_to_savings?.name || '';
    const propName = tx.property?.name || '';

    return [
      escapeCsv(tx.occurred_on),
      escapeCsv(tx.id),
      escapeCsv(tx.kind),
      Number(tx.amount || 0).toFixed(2),
      escapeCsv(tx.category?.name || 'Uncategorized'),
      escapeCsv(tx.payment_method),
      escapeCsv(sourceAccount),
      escapeCsv(destAccount),
      escapeCsv(propName),
      escapeCsv(tx.note || ''),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tenvi_transactions_${todayStr}.csv"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
