import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { SplitsClient } from './SplitsClient';

export default async function SplitsPage() {
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
    .eq('is_active', true);

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
    .eq('user_id', user?.id)
    .order('occurred_on', { ascending: false });

  return (
    <SplitsClient
      initialSplits={splits || []}
      contacts={contacts || []}
      creditCards={creditCards || []}
    />
  );
}
