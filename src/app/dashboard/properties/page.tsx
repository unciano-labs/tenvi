import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { PropertiesClient } from './PropertiesClient';
import { redirect } from 'next/navigation';

export default async function PropertiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch user's properties & assets
  const { data: properties } = await supabase
    .from('bili_properties')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // 2. Fetch property transactions (income and expense)
  const { data: propertyTransactions } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .not('property_id', 'is', null)
    .order('occurred_on', { ascending: false });

  // 3. Fetch categories for transaction modals
  const { data: categories } = await supabase
    .from('bili_categories')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .order('name', { ascending: true });

  // 4. Fetch credit cards for expense logging
  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('bank_name', { ascending: true });

  // 5. Fetch all property documents
  const { data: documents } = await supabase
    .from('bili_property_documents')
    .select(`
      *,
      property:bili_properties(name, identifier, property_type)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .order('expiry_date', { ascending: true, nullsFirst: false });

  return (
    <PropertiesClient
      properties={properties || []}
      transactions={propertyTransactions || []}
      categories={categories || []}
      creditCards={creditCards || []}
      documents={documents || []}
    />
  );

}
