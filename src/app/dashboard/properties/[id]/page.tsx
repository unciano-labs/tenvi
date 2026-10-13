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
    .eq('user_id', user.id);

  // 5. Fetch credit cards
  const { data: creditCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('is_active', true);

  // 6. Fetch documents connected to this property
  const { data: documents } = await supabase
    .from('bili_property_documents')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('property_id', id)
    .order('created_at', { ascending: false });

  return (
    <PropertyDetailsClient
      property={property}
      transactions={transactions || []}
      categories={categories || []}
      allProperties={allProperties || [property]}
      creditCards={creditCards || []}
      documents={documents || []}
    />
  );
}

