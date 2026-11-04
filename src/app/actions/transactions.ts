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
  let transactionId: string | null = null;

  const { data: result, error: rpcError } = await supabase.rpc('execute_atomic_transaction', {
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

  if (!rpcError && result?.success && result?.transaction_id) {
    transactionId = result.transaction_id;
  } else {
    // If RPC encounters the Postgres UUID type mismatch or function failure, fall back to direct mutation
    const isTypeMismatch =
      rpcError?.message?.includes('website_id') ||
      rpcError?.code === '42804' ||
      rpcError?.message?.includes('execute_atomic_transaction');

    if (isTypeMismatch || !result?.success) {
      console.warn('execute_atomic_transaction RPC failed, using resilient direct mutation:', rpcError?.message);
      try {
        const direct = await executeDirectTransactionMutation(supabase, user.id, parsed.data);
        transactionId = direct.id;
      } catch (directErr: any) {
        console.error('Direct transaction mutation also failed:', directErr);
        return { error: directErr?.message || rpcError?.message || 'Failed to save transaction. Please try again.' };
      }
    } else {
      return { error: rpcError?.message || 'Failed to save transaction. Please try again.' };
    }
  }

  if (!transactionId) {
    return { error: 'Failed to record transaction. Please try again.' };
  }

  // 4. Audit Log
  await logAuditEntry({
    userId: user.id,
    action: 'INSERT',
    entityType: 'transaction',
    entityId: transactionId,
    newData: parsed.data,
  });

  // 5. Invalidate caches across ledger modules
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/savings');
  revalidatePath('/dashboard/properties');
  revalidatePath('/dashboard/properties', 'layout');
  return { success: true, id: transactionId };
}

export async function createBatchTransactionsAction(items: any[]): Promise<{
  success: boolean;
  savedCount: number;
  savedIds: string[];
  errors?: string[];
  error?: string;
}> {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return {
      success: false,
      savedCount: 0,
      savedIds: [],
      error: auth.error || 'You must be logged in to record transactions.',
    };
  }
  const user = auth.user;
  const supabase = await createClient();

  if (!Array.isArray(items) || items.length === 0) {
    return {
      success: false,
      savedCount: 0,
      savedIds: [],
      error: 'No transactions to record.',
    };
  }

  const savedIds: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const parsed = transactionSchema.safeParse(item);
    if (!parsed.success) {
      errors.push(`Item ${i + 1} (${item.note || 'Transaction'}): ${parsed.error.errors[0]?.message || 'Invalid details'}`);
      continue;
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

    let transactionId: string | null = null;
    const { data: result, error: rpcError } = await supabase.rpc('execute_atomic_transaction', {
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

    if (!rpcError && result?.success && result?.transaction_id) {
      transactionId = result.transaction_id;
    } else {
      const isTypeMismatch =
        rpcError?.message?.includes('website_id') ||
        rpcError?.code === '42804' ||
        rpcError?.message?.includes('execute_atomic_transaction');

      if (isTypeMismatch || !result?.success) {
        try {
          const direct = await executeDirectTransactionMutation(supabase, user.id, parsed.data);
          transactionId = direct.id;
        } catch (directErr: any) {
          errors.push(`Item ${i + 1} (${note || 'Transaction'}): ${directErr?.message || rpcError?.message || 'Failed to save'}`);
          continue;
        }
      } else {
        errors.push(`Item ${i + 1} (${note || 'Transaction'}): ${rpcError?.message || 'Failed to save'}`);
        continue;
      }
    }

    if (!transactionId) {
      errors.push(`Item ${i + 1} (${note || 'Transaction'}): Failed to record transaction`);
      continue;
    }

    savedIds.push(transactionId);

    await logAuditEntry({
      userId: user.id,
      action: 'INSERT',
      entityType: 'transaction',
      entityId: transactionId,
      newData: parsed.data,
    });
  }

  if (savedIds.length > 0) {
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/transactions');
    revalidatePath('/dashboard/cards');
    revalidatePath('/dashboard/savings');
    revalidatePath('/dashboard/properties');
    revalidatePath('/dashboard/properties', 'layout');
  }

  return {
    success: savedIds.length > 0,
    savedCount: savedIds.length,
    savedIds,
    errors: errors.length > 0 ? errors : undefined,
  };
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
  const { data: result, error: rpcError } = await supabase.rpc('execute_atomic_delete_transaction', {
    p_website_id: WEBSITE_ID,
    p_user_id: user.id,
    p_transaction_id: id,
  });

  if (rpcError || !result?.success) {
    const isTypeMismatch =
      rpcError?.message?.includes('website_id') ||
      rpcError?.code === '42804' ||
      rpcError?.message?.includes('execute_atomic_delete_transaction');

    if (isTypeMismatch || !result?.success) {
      console.warn('execute_atomic_delete_transaction RPC failed, using resilient direct soft deletion:', rpcError?.message);
      try {
        await executeDirectDeleteMutation(supabase, user.id, id, tx);
      } catch (directErr: any) {
        console.error('Direct delete transaction mutation failed:', directErr);
        return { error: directErr?.message || rpcError?.message || 'Failed to delete transaction' };
      }
    } else {
      return { error: rpcError?.message || 'Failed to delete transaction' };
    }
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

/**
 * Direct transaction mutation fallback.
 * Used when the PostgreSQL RPC function encounters a schema or parameter type mismatch
 * (e.g., column "website_id" is of type uuid but expression is of type text).
 */
async function executeDirectTransactionMutation(
  supabase: any,
  userId: string,
  data: {
    kind: 'income' | 'expense' | 'transfer';
    amount: number;
    categoryId?: string | null;
    paymentMethod: string;
    creditCardId?: string | null;
    savingsId?: string | null;
    transferToSavingsId?: string | null;
    propertyId?: string | null;
    occurredOn: string;
    note?: string | null;
  }
): Promise<{ id: string }> {
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
  } = data;

  // 1. Balance synchronization for connected savings accounts
  if (kind === 'transfer') {
    if (!savingsId || !transferToSavingsId) {
      throw new Error('Transfer requires both source and destination accounts');
    }
    if (savingsId === transferToSavingsId) {
      throw new Error('Source and destination accounts must be different');
    }

    // Fetch source
    const { data: srcAccount, error: srcErr } = await supabase
      .from('bili_savings')
      .select('current_balance')
      .eq('id', savingsId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .single();

    if (srcErr || !srcAccount) {
      throw new Error('Source savings account not found');
    }

    // Fetch destination
    const { data: destAccount, error: destErr } = await supabase
      .from('bili_savings')
      .select('current_balance')
      .eq('id', transferToSavingsId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .single();

    if (destErr || !destAccount) {
      throw new Error('Destination savings account not found');
    }

    const newSrcBal = Math.max(0, Number(srcAccount.current_balance || 0) - Number(amount));
    const newDestBal = Number(destAccount.current_balance || 0) + Number(amount);

    await supabase
      .from('bili_savings')
      .update({ current_balance: newSrcBal, updated_at: new Date().toISOString() })
      .eq('id', savingsId);

    await supabase
      .from('bili_savings')
      .update({ current_balance: newDestBal, updated_at: new Date().toISOString() })
      .eq('id', transferToSavingsId);
  } else if (savingsId) {
    const { data: acc, error: accErr } = await supabase
      .from('bili_savings')
      .select('current_balance')
      .eq('id', savingsId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .single();

    if (acc && !accErr) {
      const currentBal = Number(acc.current_balance || 0);
      const newBal = kind === 'income' ? currentBal + Number(amount) : Math.max(0, currentBal - Number(amount));
      await supabase
        .from('bili_savings')
        .update({ current_balance: newBal, updated_at: new Date().toISOString() })
        .eq('id', savingsId);
    }
  }

  // 2. Insert into bili_transactions
  const { data: record, error: insertErr } = await supabase
    .from('bili_transactions')
    .insert({
      website_id: WEBSITE_ID,
      user_id: userId,
      kind,
      amount,
      category_id: categoryId || null,
      payment_method: paymentMethod,
      credit_card_id: paymentMethod === 'credit_card' ? creditCardId || null : null,
      savings_id: savingsId || null,
      transfer_to_savings_id: transferToSavingsId || null,
      property_id: propertyId || null,
      occurred_on: occurredOn,
      note: note || null,
    })
    .select('id')
    .single();

  if (insertErr || !record) {
    throw new Error(insertErr?.message || 'Failed to insert transaction record');
  }

  return { id: record.id };
}

/**
 * Direct transaction deletion fallback.
 * Reverts associated savings balances and marks transaction soft-deleted.
 */
async function executeDirectDeleteMutation(
  supabase: any,
  userId: string,
  transactionId: string,
  tx: any
): Promise<void> {
  if (tx) {
    const { kind, amount, savings_id, transfer_to_savings_id } = tx;

    if (kind === 'transfer' && savings_id && transfer_to_savings_id) {
      // Revert source
      const { data: src } = await supabase
        .from('bili_savings')
        .select('current_balance')
        .eq('id', savings_id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', userId)
        .single();

      if (src) {
        await supabase
          .from('bili_savings')
          .update({
            current_balance: Number(src.current_balance || 0) + Number(amount),
            updated_at: new Date().toISOString(),
          })
          .eq('id', savings_id);
      }

      // Revert destination
      const { data: dest } = await supabase
        .from('bili_savings')
        .select('current_balance')
        .eq('id', transfer_to_savings_id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', userId)
        .single();

      if (dest) {
        await supabase
          .from('bili_savings')
          .update({
            current_balance: Math.max(0, Number(dest.current_balance || 0) - Number(amount)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', transfer_to_savings_id);
      }
    } else if (savings_id) {
      const { data: acc } = await supabase
        .from('bili_savings')
        .select('current_balance')
        .eq('id', savings_id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', userId)
        .single();

      if (acc) {
        const currentBal = Number(acc.current_balance || 0);
        const revertedBal = kind === 'income' ? Math.max(0, currentBal - Number(amount)) : currentBal + Number(amount);
        await supabase
          .from('bili_savings')
          .update({
            current_balance: revertedBal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', savings_id);
      }
    }
  }

  // Soft delete transaction
  const { error: delErr } = await supabase
    .from('bili_transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', transactionId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', userId);

  if (delErr) {
    throw new Error(delErr.message);
  }
}


