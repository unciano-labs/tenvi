import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { CardsClient } from './CardsClient';

export default async function CardsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .eq('is_active', true)
    .order('due_day', { ascending: true });

  const { data: loans } = await supabase
    .from('bili_loans')
    .select('id, amount, balance_remaining, reason, credit_card_id, contact:bili_contacts(name)')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .not('credit_card_id', 'is', null);

  const { data: transactions } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user?.id)
    .not('credit_card_id', 'is', null)
    .order('occurred_on', { ascending: false });

  const { data: categories } = await supabase
    .from('bili_categories')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .order('name', { ascending: true });

  return (
    <CardsClient
      creditCards={creditCards || []}
      linkedLoans={loans || []}
      cardTransactions={transactions || []}
      categories={categories || []}
    />
  );
}
