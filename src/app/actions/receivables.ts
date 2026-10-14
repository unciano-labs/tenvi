'use server';

import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { deleteLoanAction } from './loans';

export interface ReceivableItemKey {
  id: string; // The loan ID or the split participant ID
  kind: 'loan' | 'split';
  splitId?: string; // If split, the bill split ID
}

/**
 * Bulk transfer borrower for loans and/or bill split participant items.
 * Can re-assign to an existing contact or a registered property/asset or a new contact.
 */
export async function bulkTransferReceivableItemsAction({
  items,
  targetContactId,
  newContactName,
}: {
  items: ReceivableItemKey[];
  targetContactId?: string;
  newContactName?: string;
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  if (!items || items.length === 0) {
    return { error: 'No items selected to transfer.' };
  }

  let finalContactId = targetContactId;
  let targetName = newContactName?.trim();

  // If user selected a property asset (prefixed with prop:)
  if (targetContactId?.startsWith('prop:')) {
    const propName = targetContactId.replace('prop:', '').trim();
    targetName = propName;
    finalContactId = undefined;
  }

  // If contact ID is not directly provided, find or create in bili_contacts
  if (!finalContactId && targetName) {
    const { data: existing } = await supabase
      .from('bili_contacts')
      .select('id, name')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .ilike('name', targetName)
      .maybeSingle();

    if (existing) {
      finalContactId = existing.id;
    } else {
      const { data: newContact, error: createErr } = await supabase
        .from('bili_contacts')
        .insert({
          website_id: WEBSITE_ID,
          user_id: user.id,
          name: targetName,
        })
        .select('id, name')
        .single();

      if (createErr || !newContact) {
        console.error('Error creating contact for transfer:', createErr);
        return { error: 'Failed to create new contact for transfer' };
      }
      finalContactId = newContact.id;
    }
  }

  if (!finalContactId) {
    return { error: 'Please choose or type a target borrower.' };
  }

  // Fetch target contact details (phone, email) to sync to loans
  const { data: targetContact } = await supabase
    .from('bili_contacts')
    .select('id, name, phone, email')
    .eq('id', finalContactId)
    .single();

  const loanIds = items.filter((it) => it.kind === 'loan').map((it) => it.id);
  const splitParticipantIds = items.filter((it) => it.kind === 'split').map((it) => it.id);

  if (loanIds.length > 0) {
    const { error: loanErr } = await supabase
      .from('bili_loans')
      .update({
        contact_id: finalContactId,
        borrower_phone: targetContact?.phone || null,
        borrower_email: targetContact?.email || null,
        updated_at: new Date().toISOString(),
      })
      .in('id', loanIds)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);

    if (loanErr) {
      console.error('Error transferring loans:', loanErr);
      return { error: 'Failed to transfer some loan items.' };
    }
  }

  if (splitParticipantIds.length > 0) {
    const { error: splitErr } = await supabase
      .from('bili_split_participants')
      .update({
        contact_id: finalContactId,
        updated_at: new Date().toISOString(),
      })
      .in('id', splitParticipantIds)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);

    if (splitErr) {
      console.error('Error transferring split participants:', splitErr);
      return { error: 'Failed to transfer some bill split items.' };
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/splits');

  return {
    success: true,
    count: items.length,
    targetName: targetContact?.name || targetName || 'New Borrower',
  };
}

/**
 * Bulk delete receivable items (loans or split participant entries).
 */
export async function bulkDeleteReceivableItemsAction({
  items,
}: {
  items: ReceivableItemKey[];
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  if (!items || items.length === 0) {
    return { error: 'No items selected to delete.' };
  }

  for (const item of items) {
    if (item.kind === 'loan') {
      await deleteLoanAction(item.id);
    } else if (item.kind === 'split') {
      await supabase
        .from('bili_split_participants')
        .delete()
        .eq('id', item.id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id);

      // Check if parent bill split has any participants left
      if (item.splitId) {
        const { count } = await supabase
          .from('bili_split_participants')
          .select('*', { count: 'exact', head: true })
          .eq('split_id', item.splitId);

        if (count === 0) {
          await supabase
            .from('bili_bill_splits')
            .delete()
            .eq('id', item.splitId)
            .eq('website_id', WEBSITE_ID)
            .eq('user_id', user.id);
        }
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/splits');

  return { success: true, count: items.length };
}

/**
 * Bulk mark as paid / settle receivable items.
 * Records repayment log, income transaction, and closes outstanding balances.
 */
export async function bulkSettleReceivableItemsAction({
  items,
  paymentMethod = 'cash',
  paidOn,
  note,
}: {
  items: ReceivableItemKey[];
  paymentMethod?: string;
  paidOn?: string;
  note?: string;
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  if (!items || items.length === 0) {
    return { error: 'No items selected to settle.' };
  }

  const effectivePaidOn = paidOn || new Date().toISOString().split('T')[0];

  for (const item of items) {
    if (item.kind === 'loan') {
      const { data: loan } = await supabase
        .from('bili_loans')
        .select('id, amount, balance_remaining, contact:bili_contacts(name)')
        .eq('id', item.id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id)
        .single();

      if (loan) {
        const remaining = Number(loan.balance_remaining || 0);

        if (remaining > 0) {
          // 1. Record repayment log
          await supabase.from('bili_loan_payments').insert({
            website_id: WEBSITE_ID,
            user_id: user.id,
            loan_id: loan.id,
            amount: remaining,
            payment_method: paymentMethod,
            paid_on: effectivePaidOn,
            note: note || 'Settled in full via bulk action',
          });

          // 2. Insert income transaction for traceability
          const contactName = (loan as any).contact?.name || 'Borrower';
          await supabase.from('bili_transactions').insert({
            website_id: WEBSITE_ID,
            user_id: user.id,
            kind: 'income',
            amount: remaining,
            payment_method: paymentMethod,
            loan_id: loan.id,
            occurred_on: effectivePaidOn,
            note: `Repayment from ${contactName}${note ? `: ${note}` : ''}`,
          });
        }

        // 3. Mark all installments paid
        await supabase
          .from('bili_loan_installments')
          .update({
            is_paid: true,
            paid_on: effectivePaidOn,
            payment_method: paymentMethod,
            updated_at: new Date().toISOString(),
          })
          .eq('loan_id', loan.id)
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', user.id);

        // 4. Update loan status to paid
        await supabase
          .from('bili_loans')
          .update({
            balance_remaining: 0,
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', loan.id)
          .eq('website_id', WEBSITE_ID)
          .eq('user_id', user.id);
      }
    } else if (item.kind === 'split') {
      await supabase
        .from('bili_split_participants')
        .update({
          is_paid: true,
          paid_on: effectivePaidOn,
          payment_note: note || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)
        .eq('website_id', WEBSITE_ID)
        .eq('user_id', user.id);
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/splits');
  revalidatePath('/dashboard/transactions');

  return { success: true, count: items.length };
}
