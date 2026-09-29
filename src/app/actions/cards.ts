'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { creditCardSchema } from '@/lib/validations/schemas';
import { requireWebsiteUser } from '@/lib/auth/guards';

export async function createCreditCardAction(data: any) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'You must be logged in to add credit cards.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = creditCardSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid card details' };
  }

  const { name, bankName, last4, creditLimit, statementDay, dueDay, colorTheme } =
    parsed.data;

  const { error } = await supabase.from('bili_credit_cards').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    name,
    bank_name: bankName,
    last_4: last4,
    credit_limit: creditLimit,
    statement_day: statementDay,
    due_day: dueDay,
    color_theme: colorTheme || 'slate',
  });

  if (error) {
    console.error('Error inserting card:', error);
    return { error: 'Failed to add credit card. Please try again.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function updateCreditCardAction(id: string, data: any) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = creditCardSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid card details' };
  }

  const { name, bankName, last4, creditLimit, statementDay, dueDay, colorTheme } =
    parsed.data;

  const { error } = await supabase
    .from('bili_credit_cards')
    .update({
      name,
      bank_name: bankName,
      last_4: last4,
      credit_limit: creditLimit,
      statement_day: statementDay,
      due_day: dueDay,
      color_theme: colorTheme || 'slate',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating card:', error);
    return { error: 'Failed to update credit card' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function deleteCreditCardAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { error } = await supabase
    .from('bili_credit_cards')
    .delete()
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting card:', error);
    return { error: 'Failed to remove credit card' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  return { success: true };
}
