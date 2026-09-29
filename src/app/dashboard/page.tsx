import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { DashboardOverviewClient } from './DashboardOverviewClient';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email || '';
  const userName =
    (user?.user_metadata?.full_name as string) || userEmail.split('@')[0] || 'Friend';

  // 1. Fetch categories
  const { data: categories } = await supabase
    .from('bili_categories')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .order('name');

  // 2. Fetch credit cards
  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .eq('is_active', true);

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // 3. Fetch recent transactions (exclude future installment placeholders)
  const { data: transactions } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*),
      credit_card:bili_credit_cards(*),
      savings:bili_savings(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .lte('occurred_on', todayISO)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300);

  // 4. Fetch active loans
  const { data: loans } = await supabase
    .from('bili_loans')
    .select(`
      *,
      contact:bili_contacts(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id);

  // 5. Fetch bill splits with participants
  const { data: splits } = await supabase
    .from('bili_bill_splits')
    .select(`
      *,
      credit_card:bili_credit_cards(*),
      participants:bili_split_participants(
        *,
        contact:bili_contacts(*)
      )
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id);

  // 6. Fetch savings accounts
  const { data: savings } = await supabase
    .from('bili_savings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .eq('is_active', true);

  // 7. Fetch properties & assets
  const { data: properties } = await supabase
    .from('bili_properties')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  return (
    <DashboardOverviewClient
      userName={userName}
      categories={categories || []}
      creditCards={creditCards || []}
      transactions={transactions || []}
      loans={loans || []}
      splits={splits || []}
      savings={savings || []}
      properties={properties || []}
    />
  );
}
