import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PropertyDetailsClient } from './PropertyDetailsClient';

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch target property
  const { data: property, error: propError } = await supabase
    .from('bili_properties')
    .select('*')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (propError || !property) {
    return (
      <div className="space-y-6 max-w-lg mx-auto pt-8">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Properties & Assets
        </Link>
        <div className="bg-card text-card-foreground rounded-3xl p-12 text-center shadow-card space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Property or Asset Not Found</h2>
          <p className="text-sm text-muted-foreground">
            This asset may have been removed or you do not have permission to view it.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/properties"
              className={cn(buttonVariants({ variant: 'default' }), 'shadow-xs')}
            >
              Return to Properties
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Fetch all direct transactions linked to this property
  const { data: transactions } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*),
      credit_card:bili_credit_cards(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('property_id', id)
    .is('deleted_at', null)
    .order('occurred_on', { ascending: false });

  // 3. Fetch categories for transaction modals
  const { data: categories } = await supabase
    .from('bili_categories')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .order('name', { ascending: true });

  // 4. Fetch all user's properties (for quick dropdown in modals)
  const { data: allProperties } = await supabase
    .from('bili_properties')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null);

  // 5. Fetch credit cards
  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null);

  // 6. Fetch documents connected to this property
  const { data: documents } = await supabase
    .from('bili_property_documents')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('property_id', id)
    .order('created_at', { ascending: false });

  // 7. Fetch matching contacts & payables (loans/advances owed by this property)
  const { data: allUserContacts } = await supabase
    .from('bili_contacts')
    .select('id, name')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  const propNameClean = property.name.trim().toLowerCase();
  const propIdentClean = (property.identifier || '').trim().toLowerCase();

  const matchedContacts = (allUserContacts || []).filter((c) => {
    const cName = c.name.trim().toLowerCase();
    if (cName === propNameClean) return true;
    if (propIdentClean && cName.includes(propIdentClean)) return true;
    if (cName.includes(propNameClean) || propNameClean.includes(cName)) return true;
    const propWords = propNameClean.split(/\s+/).filter((w: string) => w.length >= 3);
    if (propWords.some((w: string) => cName.includes(w))) return true;
    return false;
  });

  const matchedContactIds = matchedContacts.map((c) => c.id);
  const primaryPropertyContact =
    matchedContacts.find((c) => c.name.trim().toLowerCase() === propNameClean) ||
    matchedContacts[0] ||
    null;

  let propertyPayables: any[] = [];
  if (matchedContactIds.length > 0) {
    const { data: payablesData } = await supabase
      .from('bili_loans')
      .select(`
        *,
        credit_card:bili_credit_cards(*),
        payments:bili_loan_payments(*),
        installments:bili_loan_installments(*)
      `)
      .in('contact_id', matchedContactIds)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('loaned_on', { ascending: false });

    propertyPayables = payablesData || [];
  }

  // 8. Fetch liabilities linked directly to this property
  const { data: liabilities } = await supabase
    .from('bili_liabilities')
    .select(`
      *,
      credit_card:bili_credit_cards(*),
      savings:bili_savings(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('property_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // 9. Fetch user's liquid savings accounts
  const { data: savingsAccounts } = await supabase
    .from('bili_savings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  return (
    <PropertyDetailsClient
      property={property}
      transactions={transactions || []}
      categories={categories || []}
      allProperties={allProperties || [property]}
      creditCards={creditCards || []}
      documents={documents || []}
      propertyContact={primaryPropertyContact}
      payables={propertyPayables}
      liabilities={liabilities || []}
      savingsAccounts={savingsAccounts || []}
    />
  );
}

