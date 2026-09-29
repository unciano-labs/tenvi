import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { SavingsClient } from './SavingsClient';

export default async function SavingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from('bili_savings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const { data: transactions } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .not('savings_id', 'is', null)
    .order('occurred_on', { ascending: false });

  return (
    <SavingsClient
      initialAccounts={accounts || []}
      savingsTransactions={transactions || []}
    />
  );
}
