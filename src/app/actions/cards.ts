'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { creditCardSchema, cardInstallmentSchema } from '@/lib/validations/schemas';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { logAuditEntry } from '@/lib/audit/logger';

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

export async function updateCreditCardThemeAction(id: string, colorTheme: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { error } = await supabase
    .from('bili_credit_cards')
    .update({
      color_theme: colorTheme,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating card theme:', error);
    return { error: 'Failed to update credit card theme' };
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

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('bili_credit_cards')
    .update({ is_active: false, deleted_at: now, updated_at: now })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error removing card:', error);
    return { error: 'Failed to remove credit card' };
  }

  await logAuditEntry({
    userId: user.id,
    action: 'SOFT_DELETE',
    entityType: 'credit_card',
    entityId: id,
    newData: { deleted_at: now, is_active: false },
  });

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

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('bili_credit_cards')
    .update({ is_active: true, deleted_at: null, updated_at: now })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error restoring card:', error);
    return { error: 'Failed to restore credit card' };
  }

  await logAuditEntry({
    userId: user.id,
    action: 'RESTORE',
    entityType: 'credit_card',
    entityId: id,
    newData: { restored: true, deleted_at: null, is_active: true },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  return { success: true };
}

export async function markStatementPaidAction(data: {
  statementId: string;
  amountPaid: number;
  paidOn?: string | null;
  isFullPayment?: boolean;
  savingsAccountId?: string | null;
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized. Please log in.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const { statementId, amountPaid, paidOn, isFullPayment, savingsAccountId } = data;

  const { data: statement, error: fetchError } = await supabase
    .from('bili_card_statements')
    .select('*, credit_card:bili_credit_cards(name, bank_name)')
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

  const effectivePayment = isFullPayment
    ? Math.max(0, Number(statement.billed_amount) - Number(statement.paid_amount || 0))
    : Number(amountPaid || 0);

  const newPaidAmount = isFullPayment
    ? Number(statement.billed_amount)
    : Math.min(Number(statement.billed_amount), Number(statement.paid_amount || 0) + Number(amountPaid || 0));

  const newStatus =
    newPaidAmount >= Number(statement.billed_amount) ? 'paid' : 'partially_paid';

  const paymentTimestamp = paidOn ? new Date(paidOn).toISOString() : new Date().toISOString();

  // If a funding savings account is selected, deduct balance and log transfer transaction
  if (savingsAccountId && effectivePayment > 0) {
    const { data: account, error: accErr } = await supabase
      .from('bili_savings')
      .select('id, current_balance, name')
      .eq('id', savingsAccountId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single();

    if (accErr || !account) {
      return { error: 'Selected savings account not found or unauthorized' };
    }

    if (Number(account.current_balance) < effectivePayment) {
      return {
        error: `Insufficient balance in ${account.name}. Required: ₱${effectivePayment.toLocaleString()}, Available: ₱${Number(account.current_balance).toLocaleString()}`,
      };
    }

    // Deduct from savings account
    const { error: deductErr } = await supabase
      .from('bili_savings')
      .update({
        current_balance: Number(account.current_balance) - effectivePayment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', savingsAccountId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);

    if (deductErr) {
      console.error('Error deducting from savings account for statement payment:', deductErr);
      return { error: 'Failed to deduct payment from selected savings account.' };
    }

    // Create a first-class transfer transaction (does not double-count expense or gross income)
    const cardTitle = (statement.credit_card as any)?.name || 'Credit Card';
    const { error: txErr } = await supabase.from('bili_transactions').insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      savings_id: savingsAccountId,
      credit_card_id: statement.credit_card_id,
      amount: effectivePayment,
      kind: 'transfer',
      category: 'Credit Card Payment',
      description: `Statement payment for ${cardTitle}`,
      paid_at: paymentTimestamp,
      is_cleared: true,
    });

    if (txErr) {
      console.error('Error logging transfer transaction for statement payment:', txErr);
      // rollback savings deduction
      await supabase
        .from('bili_savings')
        .update({
          current_balance: Number(account.current_balance),
          updated_at: new Date().toISOString(),
        })
        .eq('id', savingsAccountId)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id);
      return { error: 'Failed to record payment transaction.' };
    }
  }

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
  revalidatePath('/dashboard/savings');
  revalidatePath('/dashboard/transactions');
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

export async function createCardInstallmentAction(data: any) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = cardInstallmentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid installment details' };
  }

  const {
    creditCardId,
    merchantName,
    principal,
    termMonths,
    monthlyAddonRate = 0,
    transactionDate,
    firstBillingMonth,
    monthlyAmortization,
    isAmortizationOverridden = false,
    notes,
  } = parsed.data;

  // 1. Fetch target card
  const { data: card, error: cardError } = await supabase
    .from('bili_credit_cards')
    .select('id, name, bank_name, due_day, credit_limit')
    .eq('id', creditCardId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (cardError || !card) {
    return { error: 'Credit card not found or inactive.' };
  }

  const dueDay = card.due_day || 15;

  // 2. Compute first payment date (locking day to card.due_day)
  let firstPaymentDate: string;
  if (firstBillingMonth && firstBillingMonth.trim()) {
    const parts = firstBillingMonth.trim().split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const clampedDay = Math.min(dueDay, daysInMonth);
    firstPaymentDate = `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
  } else {
    // Default to the upcoming due date following the transaction date
    const tx = new Date(transactionDate);
    const txYear = tx.getFullYear();
    const txMonth = tx.getMonth() + 1;
    const txDay = tx.getDate();

    let targetYear = txYear;
    let targetMonth = txMonth;
    if (txDay > dueDay) {
      targetMonth += 1;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
    }
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const clampedDay = Math.min(dueDay, daysInMonth);
    firstPaymentDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
  }

  // 3. Insert into bili_liabilities
  const { data: newLiability, error: insertError } = await supabase
    .from('bili_liabilities')
    .insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      name: merchantName,
      lender_name: `${card.bank_name} - ${card.name}`,
      liability_type: 'credit_card_installment',
      original_principal: principal,
      current_principal_balance: principal,
      annual_interest_rate: (monthlyAddonRate || 0) * 12,
      interest_rate_type: 'monthly_addon',
      interest_rate: monthlyAddonRate || 0,
      term_months: termMonths,
      monthly_payment: monthlyAmortization,
      is_amortization_overridden: Boolean(isAmortizationOverridden),
      due_day: dueDay,
      start_date: transactionDate,
      first_payment_date: firstPaymentDate,
      linked_account_type: 'credit_card',
      credit_card_id: card.id,
      status: 'active',
      notes: notes || null,
    })
    .select('id')
    .single();

  if (insertError || !newLiability) {
    console.error('Error inserting card installment liability:', insertError);
    return { error: 'Failed to record installment transaction. Please try again.' };
  }

  // 4. Log audit entry
  await logAuditEntry({
    userId: user.id,
    action: 'INSERT',
    entityType: 'liability',
    entityId: newLiability.id,
    newData: {
      name: merchantName,
      creditCardId: card.id,
      principal,
      termMonths,
      monthlyPayment: monthlyAmortization,
      firstPaymentDate,
    },
  });

  // 5. Revalidate affected paths
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/cards');
  revalidatePath(`/dashboard/cards/${card.id}`);
  revalidatePath('/dashboard/transactions');

  return { success: true, id: newLiability.id };
}

