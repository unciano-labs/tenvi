'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { loanSchema, updateLoanSchema, loanPaymentSchema } from '@/lib/validations/schemas';
import {
  calculateLoanStatus,
  generateInstallmentSchedule,
  formatMoney,
  formatDate,
  InstallmentScheduleOptions,
} from '@/lib/finance/calculations';
import { normalizePhoneNumber } from './notifications';
import {
  DEFAULT_LOAN_SMS_TEMPLATE,
  DEFAULT_LOAN_EMAIL_SUBJECT,
  DEFAULT_LOAN_EMAIL_BODY,
  interpolateTemplate,
  buildLoanNotificationVariables,
} from '@/lib/notifications/templates';
import { sendGmailEmail } from '@/lib/notifications/email';
import { sendHttpSms } from '@/lib/notifications/sms';


export async function createLoanAction(data: any) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to record loans.' };
  }

  const parsed = loanSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid loan details' };
  }

  const {
    contactId,
    newContactName,
    amount,
    reason,
    loanedOn,
    dueDate,
    isInstallment,
    installmentMonths,
    monthlyDueDay,
    monthlyInterestRate,
    creditCardId,
    downpaymentAmount,
    downpaymentPaymentMethod,
    borrowerPhone,
    borrowerEmail,
    notifyBorrower,
  } = parsed.data;

  let finalContactId = contactId;
  let borrowerName = newContactName?.trim() || 'Borrower';

  // If a new person's name was typed inline, create contact
  if (!finalContactId && newContactName && newContactName.trim()) {
    const { data: newContact, error: contactErr } = await supabase
      .from('bili_contacts')
      .insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        name: newContactName.trim(),
      })
      .select('id, name')
      .single();

    if (contactErr || !newContact) {
      console.error('Error creating contact:', contactErr);
      return { error: 'Failed to save contact name' };
    }
    finalContactId = newContact.id;
    borrowerName = newContact.name;
  } else if (finalContactId) {
    const { data: existingContact } = await supabase
      .from('bili_contacts')
      .select('name')
      .eq('id', finalContactId)
      .single();
    if (existingContact) {
      borrowerName = existingContact.name;
    }
  }

  if (!finalContactId) {
    return { error: 'Please choose or type the person who borrowed the money.' };
  }

  // 1. Fetch linked card details if creditCardId is provided
  let cardStatementDay: number | null = null;
  let cardDueDay: number | null = null;

  if (creditCardId) {
    const { data: card } = await supabase
      .from('bili_credit_cards')
      .select('id, statement_day, due_day')
      .eq('id', creditCardId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .maybeSingle();

    if (card) {
      cardStatementDay = Number(card.statement_day);
      cardDueDay = Number(card.due_day);
    }
  }

  const downpayment = Math.min(amount, Math.max(0, Number(downpaymentAmount || 0)));
  const principalToFinance = Math.max(0, amount - downpayment);
  const interestRate = Math.max(0, Number(monthlyInterestRate || 0));

  const months = isInstallment && installmentMonths ? Number(installmentMonths) : null;
  // If loan is swiped on credit card, monthly due day follows card due day!
  const effectiveDueDay = cardDueDay
    ? cardDueDay
    : (isInstallment && monthlyDueDay ? Number(monthlyDueDay) : 15);

  const totalInterest =
    isInstallment && months && months > 0 && interestRate > 0
      ? Number((principalToFinance * (interestRate / 100) * months).toFixed(2))
      : 0;

  const totalRepayable = principalToFinance + totalInterest;
  const monthlyAmount =
    months && months > 0 ? Number((totalRepayable / months).toFixed(2)) : null;

  let initialBalance = totalRepayable;
  let initialStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
  if (initialBalance <= 0) {
    initialStatus = 'paid';
  } else if (downpayment > 0) {
    initialStatus = 'partial';
  }

  // 2. Insert parent loan with credit card, interest & downpayment info
  const { data: newLoan, error: loanErr } = await supabase
    .from('bili_loans')
    .insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      contact_id: finalContactId,
      amount,
      balance_remaining: initialBalance,
      status: initialStatus,
      reason: reason || null,
      loaned_on: loanedOn,
      due_date: isInstallment ? null : dueDate || null,
      is_installment: Boolean(isInstallment),
      installment_months: months,
      monthly_due_day: isInstallment ? effectiveDueDay : null,
      monthly_amount: monthlyAmount,
      monthly_interest_rate: interestRate,
      total_interest: totalInterest,
      credit_card_id: creditCardId || null,
      downpayment_amount: downpayment,
      downpayment_paid: downpayment > 0,
      borrower_phone: borrowerPhone ? await normalizePhoneNumber(borrowerPhone) : null,
      borrower_email: borrowerEmail?.trim() || null,
      notify_borrower: notifyBorrower !== undefined ? Boolean(notifyBorrower) : true,
    })
    .select('id')
    .single();

  if (loanErr || !newLoan) {
    console.error('Error inserting loan:', loanErr);
    return { error: 'Failed to record loan. Please try again.' };
  }

  // Update contact record with phone/email if provided
  if (finalContactId && (borrowerPhone || borrowerEmail)) {
    const cleanPhone = borrowerPhone ? await normalizePhoneNumber(borrowerPhone) : undefined;
    const cleanEmail = borrowerEmail?.trim() || undefined;
    await supabase
      .from('bili_contacts')
      .update({
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(cleanEmail ? { email: cleanEmail } : {}),
      })
      .eq('id', finalContactId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);
  }

  // 2. Traceability: If downpayment paid upfront, record in payments and transactions
  if (downpayment > 0) {
    const payMethod = downpaymentPaymentMethod || 'cash';
    await supabase.from('bili_loan_payments').insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      loan_id: newLoan.id,
      amount: downpayment,
      payment_method: payMethod,
      paid_on: loanedOn,
      note: 'Initial Downpayment',
    });

    await supabase.from('bili_transactions').insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      kind: 'income',
      amount: downpayment,
      payment_method: payMethod,
      loan_id: newLoan.id,
      occurred_on: loanedOn,
      note: `Downpayment received from ${borrowerName}${reason ? ` for ${reason}` : ''}`,
    });
  }

  // 3. If installment loan, generate schedule with interest and card sync
  let generatedSchedule: ReturnType<typeof generateInstallmentSchedule> = [];
  if (isInstallment && months && months > 0 && principalToFinance > 0) {
    generatedSchedule = generateInstallmentSchedule(
      principalToFinance,
      months,
      effectiveDueDay,
      loanedOn,
      {
        monthlyInterestRate: interestRate,
        cardStatementDay,
        cardDueDay,
      }
    );
    const installmentRows = generatedSchedule.map((item) => ({
      website_id: WEBSITE_ID,
      user_id: user.id,
      loan_id: newLoan.id,
      installment_number: item.installmentNumber,
      due_date: item.dueDate,
      statement_date: item.statementDate || null,
      amount: item.amount,
      principal_amount: item.principalAmount || null,
      interest_amount: item.interestAmount || null,
      is_paid: false,
    }));

    const { error: instErr } = await supabase
      .from('bili_loan_installments')
      .insert(installmentRows);

    if (instErr) {
      console.error('Error creating installment schedule:', instErr);
    }
  }

  // 4. Traceability: If swiped on a Credit Card, record monthly installments or lump sum expense
  if (creditCardId) {
    if (isInstallment && months && months > 0 && generatedSchedule.length > 0) {
      // Map monthly installment amounts to card statement dates
      const cardExpenseRows = generatedSchedule.map((item) => ({
        website_id: WEBSITE_ID,
        user_id: user.id,
        kind: 'expense' as const,
        amount: item.amount,
        payment_method: 'credit_card',
        credit_card_id: creditCardId,
        loan_id: newLoan.id,
        occurred_on: item.statementDate || item.dueDate,
        note: `${borrowerName}${reason ? ` (${reason})` : ''} - (${String(item.installmentNumber).padStart(2, '0')}/${String(months).padStart(2, '0')})`,
      }));

      const { error: cardTxErr } = await supabase.from('bili_transactions').insert(cardExpenseRows);
      if (cardTxErr) {
        console.error('Error recording monthly installment card transactions:', cardTxErr);
      }
    } else {
      // For non-installment flexible loans, log single lump sum purchase
      const { error: cardTxErr } = await supabase.from('bili_transactions').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        kind: 'expense',
        amount,
        payment_method: 'credit_card',
        credit_card_id: creditCardId,
        loan_id: newLoan.id,
        occurred_on: loanedOn,
        note: `Card purchase for ${borrowerName}${reason ? ` (${reason})` : ''}`,
      });
      if (cardTxErr) {
        console.error('Error recording credit card expense transaction:', cardTxErr);
      }
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  return { success: true, loanId: newLoan.id };
}

export async function toggleLoanInstallmentPaidAction(
  loanId: string,
  installmentId: string,
  isPaid: boolean
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Fetch installment details and borrower name for transaction traceability
  const { data: installment } = await supabase
    .from('bili_loan_installments')
    .select('*, loan:bili_loans(id, contact:bili_contacts(name))')
    .eq('id', installmentId)
    .eq('loan_id', loanId)
    .single();

  if (!installment) {
    return { error: 'Installment record not found' };
  }

  const contactName = (installment as any).loan?.contact?.name || 'Borrower';
  const installmentNote = `Installment Month #${installment.installment_number}`;

  // 1. Update installment status
  const { error: updateErr } = await supabase
    .from('bili_loan_installments')
    .update({
      is_paid: isPaid,
      paid_on: isPaid ? new Date().toISOString().split('T')[0] : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', installmentId)
    .eq('loan_id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('Error toggling installment status:', updateErr);
    return { error: 'Failed to update installment status' };
  }

  // 2. Traceability: Sync with bili_loan_payments and bili_transactions
  if (isPaid) {
    await supabase.from('bili_loan_payments').insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      loan_id: loanId,
      amount: installment.amount,
      payment_method: 'cash',
      paid_on: new Date().toISOString().split('T')[0],
      note: installmentNote,
    });

    await supabase.from('bili_transactions').insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      kind: 'income',
      amount: installment.amount,
      payment_method: 'cash',
      loan_id: loanId,
      occurred_on: new Date().toISOString().split('T')[0],
      note: `Repayment from ${contactName} - Month #${installment.installment_number}`,
    });
  } else {
    // If marked unpaid (Undo), delete the corresponding payment and transaction
    await supabase
      .from('bili_loan_payments')
      .delete()
      .eq('loan_id', loanId)
      .eq('note', installmentNote)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);

    await supabase
      .from('bili_transactions')
      .delete()
      .eq('loan_id', loanId)
      .ilike('note', `%Month #${installment.installment_number}%`)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);
  }

  // 3. Fetch all installments to recalculate loan balance
  const { data: allInstallments } = await supabase
    .from('bili_loan_installments')
    .select('amount, is_paid')
    .eq('loan_id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (allInstallments && allInstallments.length > 0) {
    const unpaidAmount = allInstallments
      .filter((i) => !i.is_paid)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const paidCount = allInstallments.filter((i) => i.is_paid).length;

    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (unpaidAmount <= 0) {
      newStatus = 'paid';
    } else if (paidCount > 0) {
      newStatus = 'partial';
    }

    await supabase
      .from('bili_loans')
      .update({
        balance_remaining: unpaidAmount,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/transactions');
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function recordLoanPaymentAction(data: any) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const parsed = loanPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid payment details' };
  }

  const { loanId, amount, paymentMethod, paidOn, note } = parsed.data;

  // Fetch current loan
  const { data: loan, error: fetchErr } = await supabase
    .from('bili_loans')
    .select('id, amount, balance_remaining, contact:bili_contacts(name)')
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !loan) {
    return { error: 'Loan record not found' };
  }

  const contactName = (loan as any).contact?.name || 'Borrower';

  // 1. Insert repayment record
  const { error: payErr } = await supabase.from('bili_loan_payments').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    loan_id: loanId,
    amount,
    payment_method: paymentMethod || 'cash',
    paid_on: paidOn,
    note: note || null,
  });

  if (payErr) {
    console.error('Error saving payment:', payErr);
    return { error: 'Failed to save repayment record' };
  }

  // 2. Traceability: Insert income transaction into bili_transactions
  await supabase.from('bili_transactions').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    kind: 'income',
    amount,
    payment_method: paymentMethod || 'cash',
    loan_id: loanId,
    occurred_on: paidOn,
    note: `Repayment from ${contactName}${note ? `: ${note}` : ''}`,
  });

  // 3. Recalculate remaining balance & status using pure calculation facade
  const newBalance = Math.max(0, loan.balance_remaining - amount);
  const { status } = calculateLoanStatus(loan.amount, newBalance);

  // 4. Update loan record
  const { error: updateErr } = await supabase
    .from('bili_loans')
    .update({
      balance_remaining: newBalance,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('Error updating loan balance:', updateErr);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/transactions');
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function deleteLoanAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Delete linked transactions for traceability cleanup
  await supabase
    .from('bili_transactions')
    .delete()
    .eq('loan_id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  const { error } = await supabase
    .from('bili_loans')
    .delete()
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting loan:', error);
    return { error: 'Failed to delete loan' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/receivables');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/cards');
  return { success: true };
}

/**
 * Configure or generate installment schedule for an existing loan (e.g. 24 months = 24 records)
 */
export async function setupLoanInstallmentsAction({
  loanId,
  installmentMonths,
  monthlyDueDay,
  monthlyInterestRate,
}: {
  loanId: string;
  installmentMonths: number;
  monthlyDueDay: number;
  monthlyInterestRate?: number | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // 1. Fetch loan with linked card
  const { data: loan, error: loanErr } = await supabase
    .from('bili_loans')
    .select('*, credit_card:bili_credit_cards(id, statement_day, due_day)')
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (loanErr || !loan) {
    return { error: 'Loan record not found' };
  }

  const months = Number(installmentMonths);
  if (!months || months <= 0) {
    return { error: 'Please select a valid duration in months (e.g. 24 months).' };
  }

  // Card statement and due days if swiped on a card
  const cardStatementDay = loan.credit_card?.statement_day ? Number(loan.credit_card.statement_day) : null;
  const cardDueDay = loan.credit_card?.due_day ? Number(loan.credit_card.due_day) : null;
  const effectiveDueDay = cardDueDay ? cardDueDay : Math.max(1, Math.min(31, Number(monthlyDueDay) || 15));

  // Calculate amount to finance (deducting downpayment if any)
  const downpayment = Number(loan.downpayment_amount || 0);
  const amountToFinance = Math.max(0, Number(loan.amount) - downpayment);

  if (amountToFinance <= 0) {
    return { error: 'This loan has already been fully settled upfront by downpayment.' };
  }

  const interestRate =
    monthlyInterestRate !== undefined && monthlyInterestRate !== null
      ? Math.max(0, Number(monthlyInterestRate))
      : Math.max(0, Number(loan.monthly_interest_rate || 0));

  const totalInterest =
    interestRate > 0
      ? Number((amountToFinance * (interestRate / 100) * months).toFixed(2))
      : 0;

  const totalToFinance = amountToFinance + totalInterest;

  // Generate cent-safe schedule with interest and card sync
  const schedule = generateInstallmentSchedule(
    amountToFinance,
    months,
    effectiveDueDay,
    loan.loaned_on || new Date().toISOString().split('T')[0],
    {
      monthlyInterestRate: interestRate,
      cardStatementDay,
      cardDueDay,
    }
  );

  // 2. Remove any previous installments for this loan
  await supabase
    .from('bili_loan_installments')
    .delete()
    .eq('loan_id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  // 3. Batch insert new installment records
  const installmentRows = schedule.map((item) => ({
    website_id: WEBSITE_ID,
    user_id: user.id,
    loan_id: loanId,
    installment_number: item.installmentNumber,
    due_date: item.dueDate,
    statement_date: item.statementDate || null,
    amount: item.amount,
    principal_amount: item.principalAmount || null,
    interest_amount: item.interestAmount || null,
    is_paid: false,
  }));

  const { error: insertErr } = await supabase
    .from('bili_loan_installments')
    .insert(installmentRows);

  if (insertErr) {
    console.error('Error inserting installment schedule:', insertErr);
    return { error: 'Failed to generate installment records.' };
  }

  const monthlyAmount = Number((totalToFinance / months).toFixed(2));

  // 4. Update parent loan
  const { error: updateLoanErr } = await supabase
    .from('bili_loans')
    .update({
      is_installment: true,
      installment_months: months,
      monthly_due_day: effectiveDueDay,
      monthly_amount: monthlyAmount,
      monthly_interest_rate: interestRate,
      total_interest: totalInterest,
      balance_remaining: totalToFinance,
      status: downpayment > 0 ? 'partial' : 'unpaid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateLoanErr) {
    console.error('Error updating loan with installment plan:', updateLoanErr);
    return { error: 'Failed to update loan details.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/receivables');
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true, count: schedule.length };
}

/**
 * Update an existing loan's details, borrower, interest rate, downpayment, and card sync
 */
export async function updateLoanAction(data: any) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to edit loans.' };
  }

  const parsed = updateLoanSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid loan details' };
  }

  const {
    loanId,
    contactId,
    newContactName,
    amount,
    reason,
    loanedOn,
    dueDate,
    isInstallment,
    installmentMonths,
    monthlyDueDay,
    monthlyInterestRate,
    creditCardId,
    downpaymentAmount,
    borrowerPhone,
    borrowerEmail,
    notifyBorrower,
  } = parsed.data;

  // 1. Fetch existing loan
  const { data: existingLoan, error: fetchErr } = await supabase
    .from('bili_loans')
    .select(`
      *,
      contact:bili_contacts(name),
      installments:bili_loan_installments(*),
      payments:bili_loan_payments(*)
    `)
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !existingLoan) {
    return { error: 'Loan record not found.' };
  }

  let finalContactId = contactId;
  let borrowerName = newContactName?.trim() || existingLoan.contact?.name || 'Borrower';

  // Handle contact creation if new name typed
  if (!finalContactId && newContactName && newContactName.trim()) {
    const { data: newContact, error: contactErr } = await supabase
      .from('bili_contacts')
      .insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        name: newContactName.trim(),
      })
      .select('id, name')
      .single();

    if (contactErr || !newContact) {
      console.error('Error creating contact:', contactErr);
      return { error: 'Failed to save contact name' };
    }
    finalContactId = newContact.id;
    borrowerName = newContact.name;
  } else if (finalContactId) {
    const { data: existingContact } = await supabase
      .from('bili_contacts')
      .select('name')
      .eq('id', finalContactId)
      .single();
    if (existingContact) {
      borrowerName = existingContact.name;
    }
  }

  if (!finalContactId) {
    return { error: 'Please choose or type the person who borrowed the money.' };
  }

  // 2. Fetch linked card details if creditCardId is provided
  let cardStatementDay: number | null = null;
  let cardDueDay: number | null = null;

  if (creditCardId) {
    const { data: card } = await supabase
      .from('bili_credit_cards')
      .select('id, name, bank_name, statement_day, due_day')
      .eq('id', creditCardId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .maybeSingle();

    if (card) {
      cardStatementDay = Number(card.statement_day);
      cardDueDay = Number(card.due_day);
    }
  }

  // 3. Compute loan math
  const downpayment = Math.min(amount, Math.max(0, Number(downpaymentAmount || 0)));
  const principalToFinance = Math.max(0, amount - downpayment);
  const interestRate = Math.max(0, Number(monthlyInterestRate || 0));
  const months = isInstallment && installmentMonths ? Number(installmentMonths) : null;

  // If card is swiped, monthly due day follows card due day!
  const effectiveDueDay = cardDueDay
    ? cardDueDay
    : (isInstallment && monthlyDueDay ? Number(monthlyDueDay) : 15);

  const totalInterest =
    isInstallment && months && months > 0 && interestRate > 0
      ? Number((principalToFinance * (interestRate / 100) * months).toFixed(2))
      : 0;

  const totalRepayable = principalToFinance + totalInterest;
  const monthlyAmount =
    months && months > 0 ? Number((totalRepayable / months).toFixed(2)) : null;

  // 4. Calculate payments already made
  const existingInstallments = existingLoan.installments || [];
  const paidInstallmentsCount = existingInstallments.filter((i: any) => i.is_paid).length;
  const paidInstallmentsAmount = existingInstallments
    .filter((i: any) => i.is_paid)
    .reduce((sum: number, i: any) => sum + Number(i.amount || 0), 0);

  const manualPaymentsAmount = (existingLoan.payments || [])
    .filter((p: any) => p.note !== 'Initial Downpayment')
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

  const totalRepaidSoFar = isInstallment ? paidInstallmentsAmount : manualPaymentsAmount;
  const newBalanceRemaining = Math.max(0, totalRepayable - totalRepaidSoFar);

  let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
  if (newBalanceRemaining <= 0) {
    newStatus = 'paid';
  } else if (totalRepaidSoFar > 0 || downpayment > 0) {
    newStatus = 'partial';
  }

  // 5. Update parent loan
  const cleanPhone = borrowerPhone ? await normalizePhoneNumber(borrowerPhone) : null;
  const cleanEmail = borrowerEmail?.trim() || null;

  const { error: updateLoanErr } = await supabase
    .from('bili_loans')
    .update({
      contact_id: finalContactId,
      amount,
      balance_remaining: newBalanceRemaining,
      status: newStatus,
      reason: reason || null,
      loaned_on: loanedOn,
      due_date: isInstallment ? null : dueDate || null,
      is_installment: Boolean(isInstallment),
      installment_months: months,
      monthly_due_day: isInstallment ? effectiveDueDay : null,
      monthly_amount: monthlyAmount,
      monthly_interest_rate: interestRate,
      total_interest: totalInterest,
      credit_card_id: creditCardId || null,
      downpayment_amount: downpayment,
      downpayment_paid: downpayment > 0,
      borrower_phone: cleanPhone,
      borrower_email: cleanEmail,
      notify_borrower: notifyBorrower !== undefined ? Boolean(notifyBorrower) : true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateLoanErr) {
    console.error('Error updating loan:', updateLoanErr);
    return { error: 'Failed to update loan details. Please try again.' };
  }

  // 6. Update Contact record if phone/email provided
  if (finalContactId && (cleanPhone || cleanEmail)) {
    await supabase
      .from('bili_contacts')
      .update({
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(cleanEmail ? { email: cleanEmail } : {}),
      })
      .eq('id', finalContactId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);
  }

  // 7. Regenerate or update installment schedule if installment
  let updatedSchedule: ReturnType<typeof generateInstallmentSchedule> = [];
  if (isInstallment && months && months > 0 && principalToFinance > 0) {
    updatedSchedule = generateInstallmentSchedule(
      principalToFinance,
      months,
      effectiveDueDay,
      loanedOn,
      {
        monthlyInterestRate: interestRate,
        cardStatementDay,
        cardDueDay,
      }
    );

    // Remove old installments and batch insert updated ones
    await supabase
      .from('bili_loan_installments')
      .delete()
      .eq('loan_id', loanId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);

    const installmentRows = updatedSchedule.map((item, idx) => {
      // Preserve paid status up to previous paidInstallmentsCount
      const wasPaid = idx < paidInstallmentsCount;
      return {
        website_id: WEBSITE_ID,
        user_id: user.id,
        loan_id: loanId,
        installment_number: item.installmentNumber,
        due_date: item.dueDate,
        statement_date: item.statementDate || null,
        amount: item.amount,
        principal_amount: item.principalAmount || null,
        interest_amount: item.interestAmount || null,
        is_paid: wasPaid,
        paid_on: wasPaid ? new Date().toISOString().split('T')[0] : null,
      };
    });

    await supabase.from('bili_loan_installments').insert(installmentRows);
  } else if (!isInstallment) {
    // If loan is now flexible / one-time, remove any installment records
    await supabase
      .from('bili_loan_installments')
      .delete()
      .eq('loan_id', loanId)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);
  }

  // 8. Synchronize linked Credit Card expense transactions
  // Remove any previous card expense transactions for this loan
  await supabase
    .from('bili_transactions')
    .delete()
    .eq('loan_id', loanId)
    .eq('payment_method', 'credit_card')
    .eq('kind', 'expense')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (creditCardId) {
    if (isInstallment && months && months > 0 && updatedSchedule.length > 0) {
      // Map monthly installment transactions to card statement dates
      const cardExpenseRows = updatedSchedule.map((item) => ({
        website_id: WEBSITE_ID,
        user_id: user.id,
        kind: 'expense' as const,
        amount: item.amount,
        payment_method: 'credit_card',
        credit_card_id: creditCardId,
        loan_id: loanId,
        occurred_on: item.statementDate || item.dueDate,
        note: `${borrowerName}${reason ? ` (${reason})` : ''} - (${String(item.installmentNumber).padStart(2, '0')}/${String(months).padStart(2, '0')})`,
      }));
      await supabase.from('bili_transactions').insert(cardExpenseRows);
    } else {
      // For non-installment flexible loans, log single lump sum purchase
      await supabase.from('bili_transactions').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        kind: 'expense',
        amount,
        payment_method: 'credit_card',
        credit_card_id: creditCardId,
        loan_id: loanId,
        occurred_on: loanedOn,
        note: `Card purchase for ${borrowerName}${reason ? ` (${reason})` : ''}`,
      });
    }
  }

  // 9. Revalidate cache
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/receivables');
  revalidatePath(`/dashboard/loans/${loanId}`);
  revalidatePath('/dashboard/cards');
  revalidatePath('/dashboard/transactions');

  return { success: true };
}

/**
 * Update borrower contact details (phone, email, notification preferences) for a loan
 */
export async function updateLoanBorrowerContactAction({
  loanId,
  borrowerPhone,
  borrowerEmail,
  notifyBorrower,
}: {
  loanId: string;
  borrowerPhone?: string | null;
  borrowerEmail?: string | null;
  notifyBorrower: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // 1. Fetch loan
  const { data: loan, error: loanErr } = await supabase
    .from('bili_loans')
    .select('id, contact_id')
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (loanErr || !loan) {
    return { error: 'Loan record not found' };
  }

  const cleanPhone = borrowerPhone ? normalizePhoneNumber(borrowerPhone) : null;
  const cleanEmail = borrowerEmail ? borrowerEmail.trim().toLowerCase() : null;

  // 2. Update loan record
  const { error: updateErr } = await supabase
    .from('bili_loans')
    .update({
      borrower_phone: cleanPhone,
      borrower_email: cleanEmail,
      notify_borrower: notifyBorrower,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('Error updating borrower contact:', updateErr);
    return { error: 'Failed to update contact info' };
  }

  // 3. Sync contact record if linked
  if (loan.contact_id && (cleanPhone || cleanEmail)) {
    await supabase
      .from('bili_contacts')
      .update({
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(cleanEmail ? { email: cleanEmail } : {}),
      })
      .eq('id', loan.contact_id)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/loans');
  revalidatePath('/dashboard/receivables');
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

/**
 * Manually or test-trigger a reminder dispatch for a loan to the borrower
 */
export async function sendLoanBorrowerReminderAction(
  loanId: string,
  channel: 'sms' | 'email',
  customMessage?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Fetch loan with contact and installments
  const { data: loan, error: loanErr } = await supabase
    .from('bili_loans')
    .select(`
      *,
      contact:bili_contacts(name, phone, email),
      installments:bili_loan_installments(id, installment_number, due_date, amount, is_paid)
    `)
    .eq('id', loanId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .single();

  if (loanErr || !loan) {
    return { error: 'Loan record not found' };
  }

  // Fetch user's custom templates & SMTP credentials if configured
  const { data: settings } = await supabase
    .from('bili_notification_settings')
    .select('loan_sms_template, loan_email_subject, loan_email_body, smtp_email, smtp_app_password, httpsms_api_key, httpsms_from_number')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  const recipientPhone = loan.borrower_phone || (loan as any).contact?.phone;
  const recipientEmail = loan.borrower_email || (loan as any).contact?.email;
  const borrowerName = (loan as any).contact?.name || 'Borrower';

  if (channel === 'sms' && !recipientPhone) {
    return { error: 'No mobile number registered for this borrower. Please add one first.' };
  }

  if (channel === 'email' && !recipientEmail) {
    return { error: 'No email address registered for this borrower. Please add one first.' };
  }

  // Find upcoming payment / next due installment
  const todayStr = new Date().toISOString().split('T')[0];
  let upcomingTargetDate = loan.due_date;
  let upcomingAmount = Number(loan.balance_remaining);
  let installmentNote = '';

  if (loan.is_installment && Array.isArray((loan as any).installments)) {
    const unpaid = (loan as any).installments
      .filter((i: any) => !i.is_paid)
      .sort((a: any, b: any) => a.installment_number - b.installment_number);

    if (unpaid.length > 0) {
      upcomingTargetDate = unpaid[0].due_date;
      upcomingAmount = Number(unpaid[0].amount);
      installmentNote = `Month #${unpaid[0].installment_number} of ${loan.installment_months || unpaid.length}`;
    }
  }

  let daysDiff = 0;
  if (upcomingTargetDate) {
    const dueDateObj = new Date(upcomingTargetDate);
    dueDateObj.setHours(0, 0, 0, 0);
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    daysDiff = Math.ceil((dueDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
  }

  const loanVars = buildLoanNotificationVariables({
    borrowerName,
    loanTitle: loan.reason,
    dueDate: upcomingTargetDate || todayStr,
    daysRemaining: daysDiff,
    amountDue: upcomingAmount,
    installmentInfo: installmentNote,
    balanceRemaining: Number(loan.balance_remaining),
    lenderName: 'Tenvi',
  });

  const smsTemplate = settings?.loan_sms_template || DEFAULT_LOAN_SMS_TEMPLATE;
  const emailSubTemplate = settings?.loan_email_subject || DEFAULT_LOAN_EMAIL_SUBJECT;
  const emailBodyTemplate = settings?.loan_email_body || DEFAULT_LOAN_EMAIL_BODY;

  const smsBody = customMessage || interpolateTemplate(smsTemplate, loanVars);
  const emailSubject = interpolateTemplate(emailSubTemplate, loanVars);
  const emailBody = customMessage || interpolateTemplate(emailBodyTemplate, loanVars);

  const recipient = channel === 'sms' ? recipientPhone! : recipientEmail!;
  const messageBody = channel === 'sms' ? smsBody : `Subject: ${emailSubject}\n\n${emailBody}`;

  let dispatchStatus: 'sent' | 'simulated' | 'failed' = 'sent';
  let dispatchError: string | null = null;

  if (channel === 'email') {
    const emailRes = await sendGmailEmail({
      to: recipientEmail!,
      subject: emailSubject,
      text: emailBody,
      customUser: settings?.smtp_email,
      customPass: settings?.smtp_app_password,
    });
    dispatchStatus = emailRes.status;
    dispatchError = emailRes.error || null;
  } else {
    const smsRes = await sendHttpSms({
      to: recipientPhone!,
      message: smsBody,
      customApiKey: settings?.httpsms_api_key,
      customFrom: settings?.httpsms_from_number,
    });
    dispatchStatus = smsRes.status;
    dispatchError = smsRes.error || null;
  }

  // Insert into notification logs
  const { error: logErr } = await supabase.from('bili_notification_logs').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    channel,
    recipient,
    card_names: null,
    loan_id: loanId,
    email_subject: channel === 'email' ? emailSubject : null,
    message_body: messageBody,
    status: dispatchStatus,
    error_message: dispatchError,
    sent_date: todayStr,
  });

  if (logErr) {
    console.error('Error logging borrower notification:', logErr);
    return { error: 'Failed to record notification log' };
  }

  revalidatePath(`/dashboard/loans/${loanId}`);
  revalidatePath('/dashboard/settings');

  let statusFeedback = `Reminder sent to ${recipient} via ${channel.toUpperCase()}!`;
  if (dispatchStatus === 'simulated') {
    statusFeedback = `Simulation logged for ${recipient}: ${dispatchError || 'Provider not configured'}`;
  } else if (dispatchStatus === 'failed') {
    statusFeedback = `Failed to send ${channel.toUpperCase()} to ${recipient}: ${dispatchError}`;
  }

  return {
    success: dispatchStatus !== 'failed',
    channel,
    recipient,
    status: dispatchStatus,
    message: statusFeedback,
  };
}

