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

export async function softDeleteCreditCardAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { error } = await supabase
    .from('bili_credit_cards')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error removing card:', error);
    return { error: 'Failed to remove credit card' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function restoreCreditCardAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { error } = await supabase
    .from('bili_credit_cards')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error restoring card:', error);
    return { error: 'Failed to restore credit card' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function markStatementPaidAction(data: {
  statementId: string;
  amountPaid: number;
  paidOn?: string | null;
  isFullPayment?: boolean;
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized. Please log in.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { statementId, amountPaid, paidOn, isFullPayment } = data;

  const { data: statement, error: fetchError } = await supabase
    .from('bili_card_statements')
    .select('*')
    .eq('id', statementId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !statement) {
    return { error: 'Statement not found or unauthorized' };
  }

  if (statement.status === 'paid' && Number(statement.paid_amount) >= Number(statement.billed_amount)) {
    return { success: true, message: 'Statement is already marked as paid.' };
  }

  const newPaidAmount = isFullPayment
    ? Number(statement.billed_amount)
    : Math.min(Number(statement.billed_amount), Number(statement.paid_amount || 0) + Number(amountPaid || 0));

  const newStatus =
    newPaidAmount >= Number(statement.billed_amount) ? 'paid' : 'partially_paid';

  const paymentTimestamp = paidOn ? new Date(paidOn).toISOString() : new Date().toISOString();

  const { error: updateError } = await supabase
    .from('bili_card_statements')
    .update({
      paid_amount: newPaidAmount,
      paid_on: paymentTimestamp,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', statementId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating statement payment:', updateError);
    return { error: 'Failed to record statement payment. Please try again.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  revalidatePath(`/dashboard/cards/${statement.credit_card_id}`);

  return { success: true, status: newStatus, paidAmount: newPaidAmount };
}

export async function createOrUpdateStatementAction(data: {
  creditCardId: string;
  cycleStart?: string | null;
  cycleEnd: string;
  dueDate: string;
  billedAmount: number;
  minimumDue?: number;
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized. Please log in.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { creditCardId, cycleStart, cycleEnd, dueDate, billedAmount, minimumDue = 0 } = data;

  const { data: upserted, error } = await supabase
    .from('bili_card_statements')
    .upsert(
      {
        website_id: WEBSITE_ID,
        user_id: user.id,
        credit_card_id: creditCardId,
        cycle_start: cycleStart || null,
        cycle_end: cycleEnd,
        due_date: dueDate,
        billed_amount: billedAmount,
        minimum_due: minimumDue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'credit_card_id,cycle_end' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting statement:', error);
    return { error: 'Failed to save statement.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  revalidatePath(`/dashboard/cards/${creditCardId}`);

  return { success: true, data: upserted };
}

export async function toggleCardReminderAction(id: string, remindersEnabled: boolean) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { error } = await supabase
    .from('bili_credit_cards')
    .update({
      reminders_enabled: remindersEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating card reminder:', error);
    return { error: 'Failed to update reminder setting' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  return { success: true, remindersEnabled };
}

