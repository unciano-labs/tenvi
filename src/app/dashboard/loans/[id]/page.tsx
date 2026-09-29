import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, HandCoins } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { generateInstallmentSchedule } from '@/lib/finance/calculations';
import { LoanDetailsClient } from './LoanDetailsClient';

interface LoanDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [loanRes, contactsRes, cardsRes] = await Promise.all([
    supabase
      .from('bili_loans')
      .select(`
        *,
        contact:bili_contacts(*),
        credit_card:bili_credit_cards(*),
        payments:bili_loan_payments(*),
        installments:bili_loan_installments(*),
        transactions:bili_transactions(*)
      `)
      .eq('id', id)
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('bili_contacts')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('bili_credit_cards')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name'),
  ]);

  const loan = loanRes.data;
  const error = loanRes.error;
  const contacts = contactsRes.data || [];
  const creditCards = cardsRes.data || [];

  if (error || !loan) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/loans"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Loans
        </Link>
        <div className="bg-white rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <HandCoins className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Loan Not Found</h2>
          <p className="text-sm text-slate-500">
            This loan record may have been deleted or you do not have permission to view it.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/loans"
              className="bili-btn-primary inline-flex py-2.5 px-5 text-sm font-semibold shadow-sm"
            >
              Return to Loans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Auto-generate installments if loan is marked as installment but records are missing
  if (
    loan.is_installment &&
    loan.installment_months &&
    (!loan.installments || loan.installments.length === 0)
  ) {
    const downpayment = Number(loan.downpayment_amount || 0);
    const amountToFinance = Math.max(0, Number(loan.amount) - downpayment);
    const months = Number(loan.installment_months);
    const dueDay = Number(loan.monthly_due_day || 15);

    if (months > 0 && amountToFinance > 0) {
      const schedule = generateInstallmentSchedule(
        amountToFinance,
        months,
        dueDay,
        loan.loaned_on || new Date().toISOString().split('T')[0]
      );

      const rows = schedule.map((item) => ({
        website_id: WEBSITE_ID,
        user_id: user.id,
        loan_id: loan.id,
        installment_number: item.installmentNumber,
        due_date: item.dueDate,
        amount: item.amount,
        is_paid: false,
      }));

      const { data: inserted } = await supabase
        .from('bili_loan_installments')
        .insert(rows)
        .select('*');

      if (inserted) {
        loan.installments = inserted;
      }
    }
  }

  // Ensure installments are sorted by installment_number
  if (loan.installments) {
    loan.installments.sort(
      (a: any, b: any) => a.installment_number - b.installment_number
    );
  }

  // Ensure transactions are sorted chronologically
  if (loan.transactions) {
    loan.transactions.sort(
      (a: any, b: any) =>
        new Date(b.created_at || b.occurred_on).getTime() -
        new Date(a.created_at || a.occurred_on).getTime()
    );
  }

  return (
    <LoanDetailsClient
      initialLoan={loan}
      contacts={contacts}
      creditCards={creditCards}
    />
  );
}
