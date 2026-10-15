import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import {
  calculateOptimalCardToSwipe,
  calculateCardSpending,
  calculateNextDueDate,
  formatDate,
  type CardSpendingSummary,
} from '@/lib/finance/calculations';
import type { DueSoonCardItem } from '@/components/Cards/PayTheseSoonPanel';
import { CardsClient } from './CardsClient';

export const metadata = {
  title: 'Credit Cards | Tenvi',
  description: 'Manage credit cards, track when bills are made, and stay ahead of payment due dates.',
};

export default async function CardsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: creditCards },
    { data: statements },
    { data: loans },
    { data: liabilities },
    { data: transactions },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from('bili_credit_cards')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('due_day', { ascending: true }),

    supabase
      .from('bili_card_statements')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .order('cycle_end', { ascending: false }),

    supabase
      .from('bili_loans')
      .select('id, amount, balance_remaining, reason, credit_card_id, status, contact:bili_contacts(name)')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .is('deleted_at', null)
      .not('credit_card_id', 'is', null),

    supabase
      .from('bili_liabilities')
      .select('id, name, lender_name, liability_type, original_principal, current_principal_balance, term_months, monthly_payment, due_day, credit_card_id, status')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .is('deleted_at', null)
      .not('credit_card_id', 'is', null),

    supabase
      .from('bili_transactions')
      .select(`
        *,
        category:bili_categories(*)
      `)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user?.id)
      .is('deleted_at', null)
      .not('credit_card_id', 'is', null)
      .order('occurred_on', { ascending: false }),

    supabase
      .from('bili_categories')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .order('name', { ascending: true }),
  ]);

  // Attach latest statement to each card
  const statementsByCard = new Map<string, any>();
  (statements || []).forEach((st) => {
    if (!statementsByCard.has(st.credit_card_id)) {
      statementsByCard.set(st.credit_card_id, st);
    }
  });

  const cardsWithStatements = (creditCards || []).map((card) => ({
    ...card,
    color: card.color || card.color_theme,
    latest_statement: statementsByCard.get(card.id) || null,
  }));

  // Server-side compute totals and spending map (TNV-030)
  const spendingMap: Record<string, CardSpendingSummary> = {};
  let totalLimit = 0;
  let totalUsed = 0;
  let boughtForOthers = 0;

  cardsWithStatements.forEach((card) => {
    totalLimit += Number(card.credit_limit || 0);

    const spending = calculateCardSpending(card, transactions || [], loans || [], liabilities || []);
    totalUsed += spending.totalUsed;
    boughtForOthers += spending.loansSpend;

    spendingMap[card.id] = spending;
  });

  // Server-computed optimal card recommendation (TNV-030)
  const initialOptimalResult = calculateOptimalCardToSwipe(
    cardsWithStatements,
    transactions || [],
    loans || [],
    undefined,
    liabilities || []
  );

  // Server-computed pay these soon items (hidden if all cards paid or no dues incoming in 3 days)
  const initialDueSoonCards: DueSoonCardItem[] = [];
  cardsWithStatements.forEach((card) => {
    const spending = spendingMap[card.id];
    const totalBalance = card.latest_statement
      ? Number(card.latest_statement.billed_amount || 0) - Number(card.latest_statement.paid_amount || 0)
      : spending?.totalUsed || 0;

    if (totalBalance > 0) {
      const dueDateInfo = calculateNextDueDate(card.due_day);
      // Only include cards due within 3 days (or overdue)
      if (dueDateInfo.daysRemaining <= 3) {
        initialDueSoonCards.push({
          statementId: card.latest_statement?.id,
          cardId: card.id,
          cardName: card.name,
          bankName: card.bank_name,
          last4: card.last_4,
          dueDateFormatted: formatDate(dueDateInfo.nextDueDate),
          daysRemaining: dueDateInfo.daysRemaining,
          amountDue: totalBalance,
          urgency: dueDateInfo.daysRemaining < 0 ? 'overdue' : 'urgent',
        });
      }
    }
  });

  initialDueSoonCards.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return (
    <CardsClient
      creditCards={cardsWithStatements}
      linkedLoans={loans || []}
      linkedLiabilities={liabilities || []}
      cardTransactions={transactions || []}
      categories={categories || []}
      initialSpendingMap={spendingMap}
      initialTotals={{ totalLimit, totalUsed, boughtForOthers }}
      initialOptimalResult={initialOptimalResult}
      initialDueSoonCards={initialDueSoonCards}
    />
  );
}
