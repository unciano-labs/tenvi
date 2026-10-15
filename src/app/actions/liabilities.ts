'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import {
  liabilitySchema,
  updateLiabilitySchema,
  liabilityPaymentSchema,
} from '@/lib/validations/schemas';
import { LiabilityInput, LiabilityPaymentInput } from '@/types';
import { logAuditEntry } from '@/lib/audit/logger';

export async function createLiabilityAction(data: LiabilityInput) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'You must be logged in to add liabilities.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = liabilitySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid liability details' };
  }

  const {
    name,
    lenderName,
    liabilityType,
    originalPrincipal,
    currentPrincipalBalance,
    interestRateType,
    interestRate,
    annualInterestRate,
    termMonths,
    monthlyPayment,
    isAmortizationOverridden,
    dueDay,
    startDate,
    propertyId,
    linkedAccountType,
    creditCardId,
    savingsId,
    status,
    notes,
  } = parsed.data;

  // Resolve interest rate and backward-compatible annual rate
  const rateType = interestRateType || 'annual';
  const rateValue = interestRate ?? annualInterestRate ?? 0;
  const effectiveAnnualRate =
    rateType === 'monthly_addon' ? rateValue * 12 : rateValue;

  const validLinkedType = linkedAccountType && (linkedAccountType === 'credit_card' || linkedAccountType === 'savings')
    ? linkedAccountType
    : null;
  const validCreditCardId = validLinkedType === 'credit_card' && creditCardId ? creditCardId : null;
  const validSavingsId = validLinkedType === 'savings' && savingsId ? savingsId : null;

  const { data: newLiability, error } = await supabase
    .from('bili_liabilities')
    .insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      name,
      lender_name: lenderName,
      liability_type: liabilityType,
      original_principal: originalPrincipal,
      current_principal_balance: currentPrincipalBalance,
      annual_interest_rate: effectiveAnnualRate,
      interest_rate_type: rateType,
      interest_rate: rateValue,
      term_months: termMonths || null,
      monthly_payment: monthlyPayment || 0,
      is_amortization_overridden: Boolean(isAmortizationOverridden),
      due_day: dueDay || null,
      start_date: startDate || null,
      property_id: propertyId || null,
      linked_account_type: validLinkedType,
      credit_card_id: validCreditCardId,
      savings_id: validSavingsId,
      status: status || 'active',
      notes: notes || null,
    })
    .select('id')
    .single();

  if (error || !newLiability) {
    console.error('Error creating liability:', error);
    return { error: 'Failed to create liability record. Please try again.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  if (propertyId) {
    revalidatePath(`/dashboard/properties/${propertyId}`);
  }
  if (validCreditCardId) {
    revalidatePath('/dashboard/cards');
    revalidatePath(`/dashboard/cards/${validCreditCardId}`);
  }
  if (validSavingsId) {
    revalidatePath('/dashboard/savings');
  }
  return { success: true, id: newLiability.id };
}

export async function updateLiabilityAction(data: any) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = updateLiabilitySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid liability details' };
  }

  const {
    liabilityId,
    name,
    lenderName,
    liabilityType,
    originalPrincipal,
    currentPrincipalBalance,
    interestRateType,
    interestRate,
    annualInterestRate,
    termMonths,
    monthlyPayment,
    isAmortizationOverridden,
    dueDay,
    startDate,
    propertyId,
    linkedAccountType,
    creditCardId,
    savingsId,
    status,
    notes,
  } = parsed.data;

  const rateType = interestRateType || 'annual';
  const rateValue = interestRate ?? annualInterestRate ?? 0;
  const effectiveAnnualRate =
    rateType === 'monthly_addon' ? rateValue * 12 : rateValue;

  const validLinkedType = linkedAccountType && (linkedAccountType === 'credit_card' || linkedAccountType === 'savings')
    ? linkedAccountType
    : null;
  const validCreditCardId = validLinkedType === 'credit_card' && creditCardId ? creditCardId : null;
  const validSavingsId = validLinkedType === 'savings' && savingsId ? savingsId : null;

  const { error } = await supabase
    .from('bili_liabilities')
    .update({
      name,
      lender_name: lenderName,
      liability_type: liabilityType,
      original_principal: originalPrincipal,
      current_principal_balance: currentPrincipalBalance,
      annual_interest_rate: effectiveAnnualRate,
      interest_rate_type: rateType,
      interest_rate: rateValue,
      term_months: termMonths || null,
      monthly_payment: monthlyPayment || 0,
      is_amortization_overridden: Boolean(isAmortizationOverridden),
      due_day: dueDay || null,
      start_date: startDate || null,
      property_id: propertyId || null,
      linked_account_type: validLinkedType,
      credit_card_id: validCreditCardId,
      savings_id: validSavingsId,
      status: status || 'active',
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', liabilityId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating liability:', error);
    return { error: 'Failed to update liability details.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  if (propertyId) {
    revalidatePath(`/dashboard/properties/${propertyId}`);
  }
  if (validCreditCardId) {
    revalidatePath('/dashboard/cards');
    revalidatePath(`/dashboard/cards/${validCreditCardId}`);
  }
  if (validSavingsId) {
    revalidatePath('/dashboard/savings');
  }
  return { success: true };
}

export async function deleteLiabilityAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  // 1. Fetch liability for audit log
  const { data: liability } = await supabase
    .from('bili_liabilities')
    .select('*')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  // 2. Soft delete
  const { error } = await supabase
    .from('bili_liabilities')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error soft-deleting liability:', error);
    return { error: 'Failed to delete liability.' };
  }

  // 3. Log Audit
  await logAuditEntry({
    userId: user.id,
    action: 'SOFT_DELETE',
    entityType: 'liability',
    entityId: id,
    oldData: liability,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  return { success: true };
}

export async function recordLiabilityPaymentAction(data: LiabilityPaymentInput) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = liabilityPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid payment details' };
  }

  const { liabilityId, amount, principalAmount, interestAmount, paidOn, savingsAccountId, note } =
    parsed.data;

  // 1. Fetch liability
  const { data: liability, error: libErr } = await supabase
    .from('bili_liabilities')
    .select('*, property:bili_properties(name)')
    .eq('id', liabilityId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (libErr || !liability) {
    return { error: 'Liability not found or unauthorized' };
  }

  // Determine commercial amortization split (principal vs interest)
  const specifiedInterest = interestAmount != null ? Math.max(0, interestAmount) : 0;
  const specifiedPrincipal =
    principalAmount != null ? Math.max(0, principalAmount) : Math.max(0, amount - specifiedInterest);
  const effectivePrincipal = specifiedPrincipal > 0 ? specifiedPrincipal : amount;
  const effectiveInterest =
    specifiedInterest > 0 ? specifiedInterest : Math.max(0, amount - effectivePrincipal);

  // 2. If savingsAccountId provided, check balance and deduct
  if (savingsAccountId) {
    const { data: account, error: accErr } = await supabase
      .from('bili_savings')
      .select('id, current_balance, name')
      .eq('id', savingsAccountId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single();

    if (accErr || !account) {
      return { error: 'Selected savings account not found' };
    }

    if (Number(account.current_balance) < amount) {
      return {
        error: `Insufficient balance in ${account.name}. Required: ₱${amount.toLocaleString()}, Available: ₱${Number(account.current_balance).toLocaleString()}`,
      };
    }

    // Deduct total payment from savings
    const { error: deductErr } = await supabase
      .from('bili_savings')
      .update({
        current_balance: Number(account.current_balance) - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', savingsAccountId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);

    if (deductErr) {
      return { error: 'Failed to deduct from savings account.' };
    }

    // Create principal debt-reduction transaction (transfer: not double-counted as expense)
    if (effectivePrincipal > 0) {
      await supabase.from('bili_transactions').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        savings_id: savingsAccountId,
        property_id: liability.property_id || null,
        amount: effectivePrincipal,
        kind: 'transfer',
        category: 'Debt / Loan Payment',
        description: note ? `${note} (Principal)` : `Principal payment for ${liability.name}`,
        occurred_on: paidOn,
        is_cleared: true,
      });
    }

    // Create interest financing expense transaction (expense: accurate income/expense P&L)
    if (effectiveInterest > 0) {
      await supabase.from('bili_transactions').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        savings_id: savingsAccountId,
        property_id: liability.property_id || null,
        amount: effectiveInterest,
        kind: 'expense',
        category: 'Interest & Finance Charges',
        description: note ? `${note} (Interest)` : `Loan interest for ${liability.name}`,
        occurred_on: paidOn,
        is_cleared: true,
      });
    }
  }

  // 3. Update liability principal balance (reduces by principal only)
  const newBalance = Math.max(0, Number(liability.current_principal_balance) - effectivePrincipal);
  const newStatus = newBalance === 0 ? 'paid_off' : liability.status;

  const { error: updateErr } = await supabase
    .from('bili_liabilities')
    .update({
      current_principal_balance: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', liabilityId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateErr) {
    return { error: 'Failed to update liability balance.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  if (liability.property_id) {
    revalidatePath(`/dashboard/properties/${liability.property_id}`);
  }
  if (savingsAccountId) {
    revalidatePath('/dashboard/savings');
    revalidatePath('/dashboard/transactions');
  }

  return { success: true, newBalance, status: newStatus };
}
