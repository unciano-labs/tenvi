import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { TransactionsClient } from './TransactionsClient';

export default async function TransactionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: categories } = await supabase
    .from('bili_categories')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .order('name');

  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .eq('is_active', true);

  const { data: savingsAccounts } = await supabase
    .from('bili_savings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .eq('is_active', true)
    .order('name');

  // Current date (Asia/Manila time)
  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const { data: transactions } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*),
      credit_card:bili_credit_cards(*),
      savings:bili_savings(*),
      loan:bili_loans(id, contact:bili_contacts(name))
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .lte('occurred_on', todayISO)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <TransactionsClient
      initialTransactions={transactions || []}
      categories={categories || []}
      creditCards={creditCards || []}
      savingsAccounts={savingsAccounts || []}
    />
  );
}
