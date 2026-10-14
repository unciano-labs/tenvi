'use server';

import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Cards' | 'Savings' | 'Properties' | 'Loans' | 'Splits' | 'Transactions' | 'Contacts';
  href: string;
  badge?: string;
  amount?: number;
}

export async function searchGlobalAction(
  rawQuery: string
): Promise<{ items: SearchResultItem[]; error?: string }> {
  const query = (rawQuery || '').trim();
  if (!query || query.length < 2) {
    return { items: [] };
  }

  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { items: [], error: 'Unauthorized' };
  }

  const supabase = await createClient();
  const pattern = `%${query}%`;
  const userId = auth.user.id;

  try {
    const [cardsRes, savingsRes, propertiesRes, loansRes, splitsRes, txRes, contactsRes] =
      await Promise.all([
        // 1. Credit Cards
        supabase
          .from('bili_credit_cards')
          .select('id, name, bank_name, last_4, credit_limit')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .or(`name.ilike.${pattern},bank_name.ilike.${pattern},last_4.ilike.${pattern}`)
          .limit(5),

        // 2. Savings & Cash
        supabase
          .from('bili_savings_accounts')
          .select('id, name, institution_name, account_type, balance')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .or(`name.ilike.${pattern},institution_name.ilike.${pattern}`)
          .limit(5),

        // 3. Properties & Fleet
        supabase
          .from('bili_properties')
          .select('id, name, identifier, property_type, estimated_value')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .or(`name.ilike.${pattern},identifier.ilike.${pattern}`)
          .limit(5),

        // 4. Loans & Advances
        supabase
          .from('bili_loans')
          .select('id, reason, amount, balance_remaining, contact:bili_contacts(name)')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .ilike('reason', pattern)
          .limit(5),

        // 5. Bill Splits
        supabase
          .from('bili_bill_splits')
          .select('id, title, note, total_amount, occurred_on')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .or(`title.ilike.${pattern},note.ilike.${pattern}`)
          .limit(5),

        // 6. Transactions
        supabase
          .from('bili_transactions')
          .select('id, kind, amount, occurred_on, note, category:bili_categories(name)')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .ilike('note', pattern)
          .order('occurred_on', { ascending: false })
          .limit(6),

        // 7. Contacts / Borrowers
        supabase
          .from('bili_contacts')
          .select('id, name, phone, email')
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', userId)
          .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
          .limit(5),
      ]);

    const results: SearchResultItem[] = [];

    // Map Cards
    (cardsRes.data || []).forEach((c) => {
      results.push({
        id: `card-${c.id}`,
        title: `${c.bank_name} ${c.name}`,
        subtitle: `•••• ${c.last_4} · Limit: ₱${Number(c.credit_limit || 0).toLocaleString()}`,
        category: 'Cards',
        href: `/dashboard/cards/${c.id}`,
        badge: 'Card',
      });
    });

    // Map Savings
    (savingsRes.data || []).forEach((s) => {
      results.push({
        id: `savings-${s.id}`,
        title: s.name,
        subtitle: `${s.institution_name} · Balance: ₱${Number(s.balance || 0).toLocaleString()}`,
        category: 'Savings',
        href: `/dashboard/savings`,
        badge: s.account_type.replace('_', ' '),
      });
    });

    // Map Properties
    (propertiesRes.data || []).forEach((p) => {
      results.push({
        id: `prop-${p.id}`,
        title: p.name,
        subtitle: `${p.identifier ? `[${p.identifier}] ` : ''}Valuation: ₱${Number(p.estimated_value || 0).toLocaleString()}`,
        category: 'Properties',
        href: `/dashboard/properties/${p.id}`,
        badge: p.property_type.replace('_', ' '),
      });
    });

    // Map Loans
    (loansRes.data || []).forEach((l: any) => {
      const borrower = l.contact?.name || 'Borrower';
      results.push({
        id: `loan-${l.id}`,
        title: `${borrower}: ${l.reason || 'Personal Advance'}`,
        subtitle: `Remaining: ₱${Number(l.balance_remaining || 0).toLocaleString()} of ₱${Number(l.amount || 0).toLocaleString()}`,
        category: 'Loans',
        href: `/dashboard/loans/${l.id}`,
        badge: 'Loan',
      });
    });

    // Map Splits
    (splitsRes.data || []).forEach((s) => {
      results.push({
        id: `split-${s.id}`,
        title: s.title,
        subtitle: `${s.occurred_on} · Total: ₱${Number(s.total_amount || 0).toLocaleString()}`,
        category: 'Splits',
        href: `/dashboard/splits`,
        badge: 'Split',
      });
    });

    // Map Contacts
    (contactsRes.data || []).forEach((c) => {
      results.push({
        id: `contact-${c.id}`,
        title: c.name,
        subtitle: c.phone || c.email || 'Person / Entity',
        category: 'Contacts',
        href: `/dashboard/receivables/${c.id}`,
        badge: 'Entity',
      });
    });

    // Map Transactions
    (txRes.data || []).forEach((t: any) => {
      const catName = t.category?.name || (t.kind === 'income' ? 'Income' : 'Expense');
      results.push({
        id: `tx-${t.id}`,
        title: t.note || catName,
        subtitle: `${t.occurred_on} · ${t.kind.toUpperCase()} ₱${Number(t.amount || 0).toLocaleString()}`,
        category: 'Transactions',
        href: `/dashboard/transactions`,
        badge: t.kind,
      });
    });

    return { items: results };
  } catch (err: any) {
    console.error('Error in searchGlobalAction:', err);
    return { items: [], error: 'Search failed' };
  }
}
