'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { logAuditEntry } from '@/lib/audit/logger';
import {
  savingsAccountSchema,
  savingsBalanceUpdateSchema,
} from '@/lib/validations/schemas';

export async function createSavingsAccountAction(data: any) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'You must be logged in to manage savings.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = savingsAccountSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid account details' };
  }

  const {
    name,
    accountType,
    institutionName,
    accountNumberLast4,
    currentBalance,
    targetAmount,
    interestRate,
    colorTheme,
  } = parsed.data;

  const { error } = await supabase.from('bili_savings').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    name,
    account_type: accountType,
    institution_name: institutionName,
    account_number_last4: accountNumberLast4 || null,
    current_balance: currentBalance,
    target_amount: targetAmount || null,
    interest_rate: interestRate || null,
    color_theme: colorTheme || 'emerald',
    is_active: true,
  });

  if (error) {
    console.error('Error inserting savings account:', error);
    return { error: 'Failed to add savings account. Please try again.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/savings');
  return { success: true };
}

export async function updateSavingsBalanceAction(data: any) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = savingsBalanceUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid amount' };
  }

  const { id, amount, type } = parsed.data;

  // 1. Fetch current account
  const { data: account, error: fetchErr } = await supabase
    .from('bili_savings')
    .select('id, current_balance')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !account) {
    return { error: 'Account not found' };
  }

  let newBalance = Number(account.current_balance);
  if (type === 'deposit') {
    newBalance += amount;
  } else if (type === 'withdraw') {
    if (amount > newBalance) {
      return { error: 'Withdrawal amount exceeds current balance.' };
    }
    newBalance -= amount;
  } else if (type === 'set') {
    newBalance = amount;
  }

  const { error: updateErr } = await supabase
    .from('bili_savings')
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('Error updating savings balance:', updateErr);
    return { error: 'Failed to update balance' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/savings');
  return { success: true, newBalance };
}

export async function deleteSavingsAccountAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  // 1. Fetch account for audit logging
  const { data: account } = await supabase
    .from('bili_savings')
    .select('*')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  // 2. Soft delete
  const { error } = await supabase
    .from('bili_savings')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error soft-deleting savings account:', error);
    return { error: 'Failed to delete account' };
  }

  // 3. Audit Log
  await logAuditEntry({
    userId: user.id,
    action: 'SOFT_DELETE',
    entityType: 'savings',
    entityId: id,
    oldData: account,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/savings');
  return { success: true };
}

export async function updateSavingsThemeAction(id: string, colorTheme: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { error } = await supabase
    .from('bili_savings')
    .update({
      color_theme: colorTheme,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating savings theme:', error);
    return { error: 'Failed to update account theme' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/savings');
  return { success: true };
}
