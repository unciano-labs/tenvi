import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { redirect } from 'next/navigation';
import { TransactionsClient } from './TransactionsClient';

export default async function TransactionsPage() {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    redirect('/login');
  }
  const user = auth.user;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('bili_categories')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .order('name');

  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null);

  const { data: savingsAccounts } = await supabase
    .from('bili_savings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
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
      savings:savings_id(*),
      transfer_to_savings:transfer_to_savings_id(*),
      loan:bili_loans(id, contact:bili_contacts(name))
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .lte('occurred_on', todayISO)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <TransactionsClient
      initialTransactions={transactions || []}
      categories={categories || []}
      creditCards={creditCards || []}
      savingsAccounts={savingsAccounts || []}
    />
  );
}
