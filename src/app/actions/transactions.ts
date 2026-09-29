'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { transactionSchema } from '@/lib/validations/schemas';

import { requireWebsiteUser } from '@/lib/auth/guards';

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
    propertyId,
    occurredOn,
    note,
  } = parsed.data;

  // 3. Scoped Database Write
  const { data: newTx, error } = await supabase
    .from('bili_transactions')
    .insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      kind,
      amount,
      category_id: categoryId || null,
      payment_method: paymentMethod,
      credit_card_id: paymentMethod === 'credit_card' ? creditCardId || null : null,
      savings_id: savingsId || null,
      property_id: propertyId || null,
      occurred_on: occurredOn,
      note: note || null,
    })
    .select('id')
    .single();

  if (error || !newTx) {
    console.error('Error inserting transaction:', error);
    return { error: 'Failed to save transaction. Please try again.' };
  }

  // 4. If connected to a savings account, adjust account balance
  if (savingsId) {
    const { data: account } = await supabase
      .from('bili_savings')
      .select('id, current_balance')
      .eq('id', savingsId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .maybeSingle();

    if (account) {
      const current = Number(account.current_balance || 0);
      const updated = kind === 'income' ? current + amount : Math.max(0, current - amount);
      await supabase
        .from('bili_savings')
        .update({
          current_balance: updated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', savingsId)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id);
    }
  }

  // 5. Invalidate caches across ledger modules
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/savings');
  revalidatePath('/dashboard/properties');
  revalidatePath('/dashboard/properties', 'layout');
  return { success: true, id: newTx.id };
}

export async function deleteTransactionAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  // 1. Fetch transaction first to revert savings balance if needed
  const { data: tx } = await supabase
    .from('bili_transactions')
    .select('id, kind, amount, savings_id, credit_card_id')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  if (tx && tx.savings_id) {
    const { data: account } = await supabase
      .from('bili_savings')
      .select('id, current_balance')
      .eq('id', tx.savings_id)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .maybeSingle();

    if (account) {
      const current = Number(account.current_balance || 0);
      const amt = Number(tx.amount || 0);
      const reverted = tx.kind === 'income' ? Math.max(0, current - amt) : current + amt;
      await supabase
        .from('bili_savings')
        .update({
          current_balance: reverted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.savings_id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id);
    }
  }

  // 2. Delete the transaction
  const { error } = await supabase
    .from('bili_transactions')
    .delete()
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting transaction:', error);
    return { error: 'Failed to delete transaction' };
  }

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
