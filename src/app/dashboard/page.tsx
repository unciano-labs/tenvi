import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { getAuthenticatedUser } from '@/lib/auth/guards';
import { DashboardOverviewClient } from './DashboardOverviewClient';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await getAuthenticatedUser();

  const userEmail = user?.email || '';
  const userName =
    (user?.user_metadata?.full_name as string) || userEmail.split('@')[0] || 'Friend';

  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // Parallel database execution: eliminate 8 sequential waterfalls
  const [
    { data: categories },
    { data: creditCards },
    { data: transactions },
    { data: loans },
    { data: splits },
    { data: savings },
    { data: properties },
    { data: onboarding },
    { data: liabilities },
  ] = await Promise.all([
    // 1. Categories
    supabase
      .from('bili_categories')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .order('name'),

    // 2. Credit Cards
    supabase
      .from('bili_credit_cards')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .is('deleted_at', null),

    // 3. Recent Transactions
    supabase
      .from('bili_transactions')
      .select(`
        *,
        category:bili_categories(*),
        credit_card:bili_credit_cards(*),
        savings:savings_id(*),
        transfer_to_savings:transfer_to_savings_id(*)
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .is('deleted_at', null)
      .lte('occurred_on', todayISO)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300),

    // 4. Active Loans
    supabase
      .from('bili_loans')
      .select(`
        *,
        contact:bili_contacts(*)
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .is('deleted_at', null),

    // 5. Bill Splits
    supabase
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
      .eq('user_id', user?.id),

    // 6. Savings Accounts
    supabase
      .from('bili_savings')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .is('deleted_at', null),

    // 7. Properties & Assets
    supabase
      .from('bili_properties')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    // 8. User Onboarding Status
    supabase
      .from('bili_user_onboarding')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .maybeSingle(),

    // 9. Liabilities
    supabase
      .from('bili_liabilities')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

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
      liabilities={liabilities || []}
      initialOnboarding={onboarding || null}
    />
  );
}
