import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { LoansClient } from './LoansClient';

export default async function LoansPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contacts } = await supabase
    .from('bili_contacts')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .order('name');

  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .order('name');

  const { data: loans } = await supabase
    .from('bili_loans')
    .select(`
      *,
      contact:bili_contacts(*),
      credit_card:bili_credit_cards(*),
      payments:bili_loan_payments(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  return (
    <LoansClient
      initialLoans={loans || []}
      contacts={contacts || []}
      creditCards={creditCards || []}
    />
  );
}
