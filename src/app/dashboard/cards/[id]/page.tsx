import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard as CardIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CardDetailsClient } from './CardDetailsClient';

interface CardDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Fetch target credit card
  const { data: card, error: cardError } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (cardError || !card) {
    return (
      <div className="space-y-6 max-w-lg mx-auto pt-8">
        <Link
          href="/dashboard/cards"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Cards
        </Link>
        <Card className="rounded-3xl p-12 text-center shadow-xs">
          <CardContent className="p-0 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-4">
              <CardIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Credit Card Not Found</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              This card record may have been removed or you do not have permission to view it.
            </p>
            <div className="pt-6">
              <Link
                href="/dashboard/cards"
                className={buttonVariants({ variant: 'default', size: 'sm' })}
              >
                Return to Cards
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Fetch all direct transactions linked to this card
  const { data: transactions } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('credit_card_id', id)
    .order('occurred_on', { ascending: false });

  // 3. Fetch loans swiped for others using this card
  const { data: loans } = await supabase
    .from('bili_loans')
    .select(`
      *,
      contact:bili_contacts(*)
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('credit_card_id', id);

  // 4. Fetch categories for modal
  const { data: categories } = await supabase
    .from('bili_categories')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .order('name', { ascending: true });

  // 5. Fetch all active cards for modals
  const { data: allCards } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('is_active', true);

  return (
    <CardDetailsClient
      card={card}
      transactions={transactions || []}
      linkedLoans={loans || []}
      categories={categories || []}
      allCards={allCards || []}
    />
  );
}
