import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { LoansClient } from './LoansClient';

export default async function LoansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: contacts }, { data: creditCards }, { data: properties }, { data: loans }] =
    await Promise.all([
      supabase
        .from('bili_contacts')
        .select('*')
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user?.id)
        .order('name'),
      supabase
        .from('bili_credit_cards')
        .select('*')
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user?.id)
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('bili_properties')
        .select('*')
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user?.id)
        .is('deleted_at', null)
        .neq('status', 'sold')
        .order('name'),
      supabase
        .from('bili_loans')
        .select(`
          *,
          contact:bili_contacts(*),
          credit_card:bili_credit_cards(*),
          payments:bili_loan_payments(*)
        `)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ]);

  return (
    <LoansClient
      initialLoans={loans || []}
      contacts={contacts || []}
      creditCards={creditCards || []}
      properties={properties || []}
    />
  );
}
