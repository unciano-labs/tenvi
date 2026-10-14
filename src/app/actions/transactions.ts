'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { transactionSchema } from '@/lib/validations/schemas';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { logAuditEntry } from '@/lib/audit/logger';

export async function createTransactionAction(data: any) {
  // 1. Authenticate and Authorize Website Membership
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'You must be logged in to record transactions.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  // 2. Validate input with Zod
  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid transaction details' };
  }

  const {
    kind,
    amount,
    categoryId,
    paymentMethod,
    creditCardId,
    savingsId,
    transferToSavingsId,
    propertyId,
    occurredOn,
    note,
  } = parsed.data;

  // 3. Execute Atomic Database Transaction via RPC
  const { data: result, error } = await supabase.rpc('execute_atomic_transaction', {
    p_website_id: WEBSITE_ID,
    p_user_id: user.id,
    p_kind: kind,
    p_amount: amount,
    p_occurred_on: occurredOn,
    p_category_id: categoryId || null,
    p_payment_method: paymentMethod,
    p_savings_id: savingsId || null,
    p_credit_card_id: paymentMethod === 'credit_card' ? creditCardId || null : null,
    p_property_id: propertyId || null,
    p_note: note || null,
    p_transfer_to_savings_id: transferToSavingsId || null,
  });

  if (error || !result?.success) {
    console.error('Error executing atomic transaction:', error);
    return { error: error?.message || 'Failed to save transaction. Please try again.' };
  }

  // 4. Audit Log
  await logAuditEntry({
    userId: user.id,
    action: 'INSERT',
    entityType: 'transaction',
    entityId: result.transaction_id,
    newData: parsed.data,
  });

  // 5. Invalidate caches across ledger modules
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/savings');
  revalidatePath('/dashboard/properties');
  revalidatePath('/dashboard/properties', 'layout');
  return { success: true, id: result.transaction_id };
}

export async function deleteTransactionAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  // 1. Fetch transaction metadata for cache revalidation and audit log
  const { data: tx } = await supabase
    .from('bili_transactions')
    .select('*')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  // 2. Execute Atomic Soft Deletion and Balance Reversion via RPC
  const { data: result, error } = await supabase.rpc('execute_atomic_delete_transaction', {
    p_website_id: WEBSITE_ID,
    p_user_id: user.id,
    p_transaction_id: id,
  });

  if (error || !result?.success) {
    console.error('Error deleting transaction atomically:', error);
    return { error: error?.message || 'Failed to delete transaction' };
  }

  // 3. Audit Log
  await logAuditEntry({
    userId: user.id,
    action: 'SOFT_DELETE',
    entityType: 'transaction',
    entityId: id,
    oldData: tx,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  if (tx?.credit_card_id) {
    revalidatePath(`/dashboard/cards/${tx.credit_card_id}`);
  }
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/savings');
  revalidatePath('/dashboard/properties');
  revalidatePath('/dashboard/properties', 'layout');
  return { success: true };
}

/**
 * High-performance cursor-based pagination for transactions ledger
 * Query time: sub-50ms via partial compound index (website_id, user_id, occurred_on, created_at)
 */
export async function fetchMoreTransactionsAction(params: {
  beforeOccurredOn: string;
  beforeCreatedAt: string;
  limit?: number;
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized', transactions: [] };
  }
  const user = auth.user;
  const supabase = await createClient();
  const limit = Math.min(100, Math.max(1, params.limit || 50));

  const { data: transactions, error } = await supabase
    .from('bili_transactions')
    .select(`
      *,
      category:bili_categories(*),
      credit_card:bili_credit_cards(*),
      savings:savings_id(*),
      transfer_to_savings:transfer_to_savings_id(*),
      loan:bili_loans(id, contact:bili_contacts(name))
    `)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .or(
      `occurred_on.lt.${params.beforeOccurredOn},and(occurred_on.eq.${params.beforeOccurredOn},created_at.lt.${params.beforeCreatedAt})`
    )
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching paginated transactions:', error);
    return { error: 'Failed to load more transactions', transactions: [], hasMore: false };
  }

  return { transactions: transactions || [], hasMore: (transactions?.length || 0) === limit };
}

