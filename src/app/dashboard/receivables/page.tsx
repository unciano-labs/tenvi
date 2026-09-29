import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { ReceivablesClient } from './ReceivablesClient';

export const metadata = {
  title: 'Receivables & Money Owed | Tenvi',
  description:
    'Comprehensive command center for all accounts receivable, friendly loans, shared bill splits, and debtor collection management.',
};

export default async function ReceivablesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: contacts },
    { data: creditCards },
    { data: loans },
    { data: splits },
  ] = await Promise.all([
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
      .order('name'),
    supabase
      .from('bili_loans')
      .select(`
        *,
        contact:bili_contacts(*),
        credit_card:bili_credit_cards(*),
        payments:bili_loan_payments(*),
        installments:bili_loan_installments(*)
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false }),
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
      .eq('user_id', user?.id)
      .order('occurred_on', { ascending: false }),
  ]);

  return (
    <ReceivablesClient
      initialLoans={loans || []}
      initialSplits={splits || []}
      contacts={contacts || []}
      creditCards={creditCards || []}
    />
  );
}
