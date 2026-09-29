'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  HandCoins,
  AlertCircle,
  Loader2,
  Undo2,
  Check,
  CreditCard,
  Plus,
  Sparkles,
  Settings2,
  Bell,
  Phone,
  Mail,
  Send,
  Edit2,
  User,
  MessageSquare,
  RotateCcw,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  toggleLoanInstallmentPaidAction,
  setupLoanInstallmentsAction,
  updateLoanBorrowerContactAction,
  sendLoanBorrowerReminderAction,
} from '@/app/actions/loans';
import { Loan, LoanInstallment, Contact, CreditCard as CreditCardType } from '@/types';
import { formatMoney, formatDate, calculateLoanStatus } from '@/lib/finance/calculations';
import { LoanPaymentModal } from '@/components/Forms/LoanPaymentModal';
import { EditLoanModal } from '@/components/Forms/EditLoanModal';
import { INSTALLMENT_MONTHS_OPTIONS } from '@/lib/constants';
import {
  LOAN_TEMPLATE_VARIABLES,
  DEFAULT_LOAN_SMS_TEMPLATE,
  DEFAULT_LOAN_EMAIL_BODY,
  DEFAULT_LOAN_EMAIL_SUBJECT,
  interpolateTemplate,
  buildLoanNotificationVariables,
} from '@/lib/notifications/templates';

interface LoanDetailsClientProps {
  initialLoan: Loan;
  contacts?: Contact[];
  creditCards?: CreditCardType[];
}

function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function getDueStatus(dueDateStr: string, isPaid: boolean) {
  if (isPaid) return { text: 'Settled', variant: 'paid' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'day' : 'days'}`,
      variant: 'overdue',
    };
  }
  if (diffDays === 0) {
    return { text: 'Due today', variant: 'due-today' };
  }
  if (diffDays === 1) {
    return { text: 'Due tomorrow', variant: 'due-soon' };
  }
  if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, variant: 'due-soon' };
  }
  return { text: `Due in ${diffDays} days`, variant: 'normal' };
}

export function LoanDetailsClient({
  initialLoan,
  contacts = [],
  creditCards = [],
}: LoanDetailsClientProps) {
  const router = useRouter();
  const [loan, setLoan] = useState<Loan>(initialLoan);
  const [loadingInstallmentId, setLoadingInstallmentId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditLoanModalOpen, setIsEditLoanModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [isConfiguringSchedule, setIsConfiguringSchedule] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number>(
    loan.installment_months || 24
  );
  const [selectedDueDay, setSelectedDueDay] = useState<number>(
    loan.monthly_due_day || (loan.loaned_on ? parseInt(loan.loaned_on.split('-')[2], 10) : 15)
  );
  const [selectedRate, setSelectedRate] = useState<number>(
    Number(loan.monthly_interest_rate || 0)
  );
  const [isSettingUpSchedule, setIsSettingUpSchedule] = useState(false);

  // Borrower contact & notification states
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editPhone, setEditPhone] = useState(
    loan.borrower_phone || loan.contact?.phone || ''
  );
  const [editEmail, setEditEmail] = useState(
    loan.borrower_email || loan.contact?.email || ''
  );
  const [editNotify, setEditNotify] = useState(loan.notify_borrower !== false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);

  // Message customization states
  const [isCustomizingMessage, setIsCustomizingMessage] = useState(false);
  const [customChannel, setCustomChannel] = useState<'sms' | 'email'>('sms');
  const [customMessageText, setCustomMessageText] = useState('');

  React.useEffect(() => {
    setLoan(initialLoan);
    if (initialLoan.installment_months) {
      setSelectedMonths(initialLoan.installment_months);
    }
    if (initialLoan.monthly_due_day) {
      setSelectedDueDay(initialLoan.monthly_due_day);
    }
    setEditPhone(initialLoan.borrower_phone || initialLoan.contact?.phone || '');
    setEditEmail(initialLoan.borrower_email || initialLoan.contact?.email || '');
    setEditNotify(initialLoan.notify_borrower !== false);
  }, [initialLoan]);

  // Compute current upcoming payment info and dynamic variables
  const nextUnpaidInst = (loan.installments || []).find((i) => !i.is_paid);
  const targetDueDate = nextUnpaidInst
    ? nextUnpaidInst.due_date
    : loan.due_date || new Date().toISOString().split('T')[0];
  const targetAmount = nextUnpaidInst
    ? Number(nextUnpaidInst.amount)
    : Number(loan.balance_remaining);
  const installmentTermLabel = nextUnpaidInst
    ? `Month #${nextUnpaidInst.installment_number} of ${loan.installment_months || (loan.installments || []).length}`
    : 'Scheduled Repayment';

  const dueDateObj = new Date(targetDueDate);
  dueDateObj.setHours(0, 0, 0, 0);
  const todayObj = new Date();
  todayObj.setHours(0, 0, 0, 0);
  const daysDiff = Math.ceil((dueDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

  const currentLoanVariables = buildLoanNotificationVariables({
    borrowerName: loan.contact?.name || 'Borrower',
    loanTitle: loan.reason,
    dueDate: targetDueDate,
    daysRemaining: daysDiff,
    amountDue: targetAmount,
    installmentInfo: installmentTermLabel,
    balanceRemaining: Number(loan.balance_remaining),
    lenderName: 'Tenvi',
  });

  const handleOpenCustomizer = (channel: 'sms' | 'email') => {
    setCustomChannel(channel);
    setIsCustomizingMessage(true);
    const template = channel === 'sms' ? DEFAULT_LOAN_SMS_TEMPLATE : DEFAULT_LOAN_EMAIL_BODY;
    setCustomMessageText(interpolateTemplate(template, currentLoanVariables));
  };

  const handleSwitchCustomChannel = (channel: 'sms' | 'email') => {
    setCustomChannel(channel);
    const template = channel === 'sms' ? DEFAULT_LOAN_SMS_TEMPLATE : DEFAULT_LOAN_EMAIL_BODY;
    setCustomMessageText(interpolateTemplate(template, currentLoanVariables));
  };

  const handleInsertLoanVar = (varKey: string) => {
    const val = currentLoanVariables[varKey] || `{{${varKey}}}`;
    setCustomMessageText((prev) => `${prev} ${val}`);
    toast.success(`Inserted ${val}`);
  };

  const handleResetCustomText = () => {
    const template = customChannel === 'sms' ? DEFAULT_LOAN_SMS_TEMPLATE : DEFAULT_LOAN_EMAIL_BODY;
    setCustomMessageText(interpolateTemplate(template, currentLoanVariables));
    toast.success('Reset message to standard template!');
  };

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    const res = await updateLoanBorrowerContactAction({
      loanId: loan.id,
      borrowerPhone: editPhone.trim() || null,
      borrowerEmail: editEmail.trim() || null,
      notifyBorrower: editNotify,
    });
    setIsSavingContact(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Borrower contact & notification preferences updated!');
      setLoan((prev) => ({
        ...prev,
        borrower_phone: editPhone.trim() || null,
        borrower_email: editEmail.trim() || null,
        notify_borrower: editNotify,
      }));
      setIsEditingContact(false);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const handleSendReminder = async (channel: 'sms' | 'email', customText?: string) => {
    setIsSendingReminder(channel);
    const res = await sendLoanBorrowerReminderAction(loan.id, channel, customText);
    setIsSendingReminder(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || `Reminder sent via ${channel.toUpperCase()}!`);
      if (customText) {
        setIsCustomizingMessage(false);
      }
    }
  };


  const remainingPrincipal = Math.max(
    0,
    Number(loan.amount) - Number(loan.downpayment_amount || 0)
  );
  const totalInterestCalculated =
    remainingPrincipal * ((selectedRate || 0) / 100) * (selectedMonths || 24);
  const totalRepayable = remainingPrincipal + totalInterestCalculated;
  const previewMonthly = (
    totalRepayable / (selectedMonths || 24)
  ).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSetupSchedule = async () => {
    setIsSettingUpSchedule(true);
    const res = await setupLoanInstallmentsAction({
      loanId: loan.id,
      installmentMonths: selectedMonths,
      monthlyDueDay: selectedDueDay,
      monthlyInterestRate: selectedRate,
    });
    setIsSettingUpSchedule(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        `Generated ${selectedMonths}-month payment schedule with ${selectedMonths} records!`
      );
      setIsConfiguringSchedule(false);
      startTransition(() => {
        router.refresh();
      });
    }
  };

  const installments = [...(loan.installments || [])].sort(
    (a, b) => a.installment_number - b.installment_number
  );

  const paidInstallmentsCount = installments.filter((i) => i.is_paid).length;
  const totalInstallmentsCount = installments.length;

  const math = calculateLoanStatus(loan.amount, loan.balance_remaining);

  const handleToggleInstallment = async (installment: LoanInstallment) => {
    const nextIsPaid = !installment.is_paid;
    setLoadingInstallmentId(installment.id);

    // Optimistic local update
    const previousInstallments = loan.installments || [];
    const updatedInstallments = previousInstallments.map((item) =>
      item.id === installment.id
        ? {
            ...item,
            is_paid: nextIsPaid,
            paid_on: nextIsPaid ? new Date().toISOString().split('T')[0] : null,
          }
        : item
    );

    const newUnpaid = updatedInstallments
      .filter((i) => !i.is_paid)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const paidCount = updatedInstallments.filter((i) => i.is_paid).length;
    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newUnpaid <= 0) {
      newStatus = 'paid';
    } else if (paidCount > 0) {
      newStatus = 'partial';
    }

    setLoan((prev) => ({
      ...prev,
      balance_remaining: newUnpaid,
      status: newStatus,
      installments: updatedInstallments,
    }));

    const res = await toggleLoanInstallmentPaidAction(
      loan.id,
      installment.id,
      nextIsPaid
    );

    setLoadingInstallmentId(null);

    if (res?.error) {
      toast.error(res.error);
      // Rollback
      setLoan(initialLoan);
    } else {
      toast.success(
        nextIsPaid
          ? `Month #${installment.installment_number} marked as paid!`
          : `Month #${installment.installment_number} marked as unpaid.`
      );
      startTransition(() => {
        router.refresh();
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/loans"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Loans
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsEditLoanModalOpen(true)}
            className="bili-btn-secondary py-2.5 px-4 text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Edit2 className="w-4 h-4 text-slate-500" />
            Edit Loan Details
          </button>

          {loan.status !== 'paid' && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="bili-btn-primary py-2.5 px-4 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Record Repayment
            </button>
          )}
        </div>
      </div>

      {/* Main Loan Overview Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <HandCoins className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {loan.contact?.name || 'Borrower'}
                </h1>
                {loan.is_installment && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {loan.installment_months} Months Installment
                  </span>
                )}
                {Number(loan.monthly_interest_rate || 0) > 0 && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 inline-flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    {loan.monthly_interest_rate}% / mo Interest
                  </span>
                )}
                {loan.credit_card && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 inline-flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    Card Cycle Synced
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {loan.reason || 'Personal loan record'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full self-start whitespace-nowrap ${
              loan.status === 'paid'
                ? 'bg-emerald-50 text-emerald-800'
                : loan.status === 'partial'
                ? 'bg-blue-50 text-blue-800'
                : 'bg-amber-50 text-amber-900'
            }`}
          >
            {loan.status === 'paid'
              ? 'All Paid Up ✅'
              : loan.status === 'partial'
              ? 'Partially Paid'
              : 'Unpaid'}
          </span>
        </div>

        {/* Balance Metrics Card */}
        <div className="p-6 rounded-2xl bg-[#F6F7F9] space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <span className="text-xs text-slate-400 font-medium block">
                Remaining Balance
              </span>
              <span className="text-3xl font-extrabold text-slate-900">
                {formatMoney(loan.balance_remaining)}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">
                Total Purchase / Amount
              </span>
              <span className="text-2xl font-bold text-slate-700">
                {formatMoney(loan.amount)}
              </span>
            </div>

            {loan.downpayment_amount && loan.downpayment_amount > 0 ? (
              <div>
                <span className="text-xs text-slate-400 font-medium block">
                  Downpayment Paid
                </span>
                <span className="text-2xl font-bold text-emerald-700">
                  {formatMoney(loan.downpayment_amount)}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs text-slate-400 font-medium block">
                  Financed Principal
                </span>
                <span className="text-2xl font-bold text-slate-700">
                  {formatMoney(loan.amount)}
                </span>
              </div>
            )}

            <div>
              <span className="text-xs text-slate-400 font-medium block">
                Total Repaid So Far
              </span>
              <span className="text-2xl font-bold text-emerald-700">
                {formatMoney(math.paidAmount)}
              </span>
            </div>
          </div>

          {/* Interest Breakdown row if loan has monthly interest */}
          {Number(loan.monthly_interest_rate || 0) > 0 && (
            <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white shadow-xs flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Monthly Interest Rate</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {loan.monthly_interest_rate}% / month
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white shadow-xs flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Total Interest</span>
                <span className="text-xs font-bold text-slate-900">
                  {formatMoney(loan.total_interest || 0)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white shadow-xs flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Total Repayable (Principal + Interest)</span>
                <span className="text-xs font-extrabold text-blue-700">
                  {formatMoney(
                    (Number(loan.amount) - Number(loan.downpayment_amount || 0)) +
                    Number(loan.total_interest || 0) +
                    Number(loan.downpayment_amount || 0)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Progress Bar (no gradients, solid emerald/slate) */}
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${math.percentPaid}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>{math.percentPaid}% of total loan repaid</span>
              {loan.is_installment && (
                <span>
                  {paidInstallmentsCount} of {totalInstallmentsCount} months completed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Loan Meta details row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#F6F7F9]">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Date Lent
            </span>
            <span className="text-sm font-bold text-slate-900 mt-1 block">
              {formatDate(loan.loaned_on)}
            </span>
          </div>

          {loan.is_installment ? (
            <>
              <div className="p-4 rounded-2xl bg-[#F6F7F9]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Monthly Due Day
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  Every {getOrdinalSuffix(loan.monthly_due_day || 15)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6F7F9]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Monthly Due Amount
                </span>
                <span className="text-sm font-bold text-blue-700 mt-1 block">
                  {loan.monthly_amount ? formatMoney(loan.monthly_amount) : 'Calculated'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6F7F9]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Installment Term
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {loan.installment_months} Months
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6F7F9]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Interest Rate
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {Number(loan.monthly_interest_rate || 0) > 0
                    ? `${loan.monthly_interest_rate}% / month`
                    : '0% (No Interest)'}
                </span>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-[#F6F7F9]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Target Return Date
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {loan.due_date ? formatDate(loan.due_date) : 'Flexible (No set date)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Linked Credit Card & Downpayment Highlights */}
      {(loan.credit_card || (loan.downpayment_amount && loan.downpayment_amount > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loan.credit_card && (
            <div className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden min-w-0 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Purchased via Credit Card
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Cycle Synchronized ⚡
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {loan.credit_card.bank_name} - {loan.credit_card.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Card ending in <span className="font-semibold text-slate-700">•••• {loan.credit_card.last_4}</span>
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    Swiped: {formatMoney(loan.amount)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    Statement Cutoff: Every {getOrdinalSuffix(loan.credit_card.statement_day)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Payment Due: Every {getOrdinalSuffix(loan.credit_card.due_day)}
                  </span>
                  <Link
                    href="/dashboard/cards"
                    className="text-xs font-semibold text-blue-600 hover:underline ml-auto"
                  >
                    View Card Statements →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {loan.downpayment_amount && loan.downpayment_amount > 0 ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden min-w-0 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Initial Downpayment
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Settled Upfront ✅
                  </span>
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {formatMoney(loan.downpayment_amount)}
                </div>
                <p className="text-xs text-slate-500">
                  Paid on {formatDate(loan.loaned_on)}. Net financed balance: <span className="font-semibold text-slate-800">{formatMoney(loan.amount - loan.downpayment_amount)}</span>.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Borrower Contact & Automated Reminders Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  Borrower Contact & Automated Reminders
                </h2>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    loan.notify_borrower !== false
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {loan.notify_borrower !== false
                    ? '🔔 3 Days Before Due Active'
                    : '🔕 Reminders Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated notification sent once a day 3 days before payment due date to keep repayments on time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingContact(!isEditingContact)}
              className="bili-btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              {isEditingContact ? 'Cancel Edit' : 'Edit Contact'}
            </button>
          </div>
        </div>

        {/* Inline Contact Editor */}
        {isEditingContact ? (
          <div className="p-5 rounded-2xl bg-[#F6F7F9] space-y-4 animate-in fade-in duration-150">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Update Borrower Notification Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Borrower Mobile Number (SMS)
                </label>
                <input
                  type="tel"
                  placeholder="0917 123 4567"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bili-input w-full text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Borrower Email Address
                </label>
                <input
                  type="email"
                  placeholder="borrower@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bili-input w-full text-sm bg-white"
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editNotify}
                  onChange={(e) => setEditNotify(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Automatically dispatch reminder 3 days before due date (once a day)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingContact(false)}
                  className="text-xs font-semibold text-slate-500 px-3.5 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingContact}
                  onClick={handleSaveContact}
                  className="bili-btn-primary py-2 px-5 text-xs font-semibold shadow-sm"
                >
                  {isSavingContact ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Contact'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Contact Details View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#F6F7F9]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Mobile Number
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {loan.borrower_phone || (loan as any).contact?.phone || (
                    <span className="text-slate-400 font-normal italic">None nominated</span>
                  )}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6F7F9]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block truncate">
                  {loan.borrower_email || (loan as any).contact?.email || (
                    <span className="text-slate-400 font-normal italic">None nominated</span>
                  )}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6F7F9]">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Next Scheduled Alert
                </span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">
                  {loan.status === 'paid' ? (
                    <span className="text-emerald-700 font-semibold">Loan fully paid</span>
                  ) : loan.is_installment && installments.find((i) => !i.is_paid) ? (
                    (() => {
                      const next = installments.find((i) => !i.is_paid)!;
                      return `Month #${next.installment_number} (${formatDate(next.due_date)})`;
                    })()
                  ) : loan.due_date ? (
                    formatDate(loan.due_date)
                  ) : (
                    'Flexible'
                  )}
                </span>
              </div>
            </div>

            {/* Test / Manual Dispatch Controls */}
            {loan.status !== 'paid' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#F6F7F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Quick Alert Dispatch:</span>{' '}
                    Send reminder now or customize the message with live variables before sending.
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={isSendingReminder !== null || !(loan.borrower_phone || (loan as any).contact?.phone)}
                      onClick={() => handleSendReminder('sms')}
                      className="bili-btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSendingReminder === 'sms' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      Send SMS Now
                    </button>

                    <button
                      type="button"
                      disabled={isSendingReminder !== null || !(loan.borrower_email || (loan as any).contact?.email)}
                      onClick={() => handleSendReminder('email')}
                      className="bili-btn-secondary py-2 px-3.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSendingReminder === 'email' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      Send Email Now
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isCustomizingMessage) {
                          setIsCustomizingMessage(false);
                        } else {
                          handleOpenCustomizer('sms');
                        }
                      }}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 py-2 px-3.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                      {isCustomizingMessage ? 'Close Customizer' : 'Customize & Preview'}
                    </button>
                  </div>
                </div>

                {/* Inline Message Customizer Drawer */}
                {isCustomizingMessage && (
                  <div className="p-5 rounded-2xl bg-[#F6F7F9] space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                          Customize Message for {loan.contact?.name || 'Borrower'}
                        </span>
                        <div className="flex items-center gap-1 p-0.5 bg-white rounded-lg shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleSwitchCustomChannel('sms')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                              customChannel === 'sms'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            SMS Text
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchCustomChannel('email')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                              customChannel === 'email'
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            Email
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetCustomText}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 self-start sm:self-auto"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        Reset to Default
                      </button>
                    </div>

                    {/* Variable Inserter Chips */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        Tap to Insert Dynamic Variable Value:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {LOAN_TEMPLATE_VARIABLES.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => handleInsertLoanVar(v.key)}
                            className="bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-700 shadow-sm transition-all"
                            title={`Insert ${currentLoanVariables[v.key]}`}
                          >
                            <span className="font-mono text-blue-600 font-bold text-xs">
                              {v.label}:
                            </span>{' '}
                            <span className="text-slate-600 text-xs">
                              {currentLoanVariables[v.key] || v.sample}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editable Message Textarea */}
                    <div>
                      <textarea
                        rows={4}
                        value={customMessageText}
                        onChange={(e) => setCustomMessageText(e.target.value)}
                        placeholder="Write reminder message..."
                        className="bili-input w-full text-sm font-sans bg-white leading-relaxed resize-y"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                        <span>
                          Sending to:{' '}
                          <strong className="text-slate-700">
                            {customChannel === 'sms'
                              ? loan.borrower_phone || (loan as any).contact?.phone || 'No phone set'
                              : loan.borrower_email || (loan as any).contact?.email || 'No email set'}
                          </strong>
                        </span>
                        <span>{customMessageText.length} characters</span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCustomizingMessage(false)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3.5 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={
                          isSendingReminder !== null ||
                          !customMessageText.trim() ||
                          (customChannel === 'sms'
                            ? !(loan.borrower_phone || (loan as any).contact?.phone)
                            : !(loan.borrower_email || (loan as any).contact?.email))
                        }
                        onClick={() => handleSendReminder(customChannel, customMessageText)}
                        className="bili-btn-primary py-2 px-5 text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSendingReminder ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Dispatching...
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Dispatch Custom {customChannel.toUpperCase()}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Installment Schedule Table Section */}
      {loan.is_installment && installments.length > 0 ? (
        <div className="space-y-4">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Monthly Payment Schedule
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                  {totalInstallmentsCount} Months • {totalInstallmentsCount} Records
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete breakdown of all {totalInstallmentsCount} monthly records until end of loan. Tap &quot;Mark as Paid&quot; when settled.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsConfiguringSchedule(!isConfiguringSchedule)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                {isConfiguringSchedule ? 'Close Editor' : 'Change Term / Plan'}
              </button>
              <div className="text-xs font-semibold text-slate-600 bg-white px-3.5 py-2 rounded-xl shadow-sm">
                Progress: <span className="text-emerald-700 font-bold">{paidInstallmentsCount}</span> / {totalInstallmentsCount} paid
              </div>
            </div>
          </div>

          {/* Optional Reconfigure Schedule Drawer */}
          {isConfiguringSchedule && (
            <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  Reconfigure Payment Schedule Terms
                </h3>
                <span className="text-xs text-slate-500">
                  Select new duration to regenerate records
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Choose Duration (Months)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INSTALLMENT_MONTHS_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMonths(m)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedMonths === m
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m} Months {m === 24 ? '(Popular)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Monthly Due Day
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={selectedDueDay}
                      onChange={(e) => setSelectedDueDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                      className="bili-input w-full text-sm bg-white"
                      placeholder="e.g. 20 (Due every 20th)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Monthly Interest Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={selectedRate}
                      onChange={(e) => setSelectedRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="bili-input w-full text-sm bg-white"
                      placeholder="0.00%"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-white flex flex-col justify-center">
                    <span className="text-xs text-slate-500 font-medium">New Monthly Due:</span>
                    <span className="text-lg font-extrabold text-blue-700">
                      ₱{previewMonthly} / month
                    </span>
                    <span className="text-xs text-slate-400">
                      Generates exactly {selectedMonths} records until loan end
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsConfiguringSchedule(false)}
                    className="text-xs font-semibold text-slate-500 px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSettingUpSchedule}
                    onClick={handleSetupSchedule}
                    className="bili-btn-primary py-2 px-5 text-xs font-semibold shadow-sm"
                  >
                    {isSettingUpSchedule ? 'Updating...' : `Update to ${selectedMonths} Months (${selectedMonths} Records)`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Table / List */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm space-y-3">
            {/* Header row */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="col-span-3">Month / Term</div>
              <div className="col-span-3">Due & Statement Date</div>
              <div className="col-span-2">Amount Due</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {/* Installment Rows */}
            <div className="space-y-2">
              {installments.map((inst) => {
                const dueStatus = getDueStatus(inst.due_date, inst.is_paid);
                const isLoading = loadingInstallmentId === inst.id;

                return (
                  <div
                    key={inst.id}
                    className={`rounded-2xl p-4 sm:px-4 sm:py-3.5 transition-colors flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center ${
                      inst.is_paid
                        ? 'bg-[#F6F7F9]/80'
                        : dueStatus.variant === 'overdue'
                        ? 'bg-rose-50/50'
                        : 'bg-[#F6F7F9]'
                    }`}
                  >
                    {/* Month # */}
                    <div className="col-span-3 flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          inst.is_paid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-white text-slate-700 shadow-sm'
                        }`}
                      >
                        {inst.installment_number}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">
                          Month {inst.installment_number} of {totalInstallmentsCount}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Installment record #{inst.installment_number}
                        </span>
                      </div>
                    </div>

                    {/* Due Date & countdown */}
                    <div className="col-span-3">
                      <div className="text-sm font-semibold text-slate-800">
                        {formatDate(inst.due_date)}
                      </div>
                      {inst.statement_date && (
                        <div className="text-xs text-indigo-600 font-medium">
                          Statement Cutoff: {formatDate(inst.statement_date)}
                        </div>
                      )}
                      <span
                        className={`text-xs font-medium block ${
                          inst.is_paid
                            ? 'text-emerald-700'
                            : dueStatus.variant === 'overdue'
                            ? 'text-rose-600 font-semibold'
                            : dueStatus.variant === 'due-today' || dueStatus.variant === 'due-soon'
                            ? 'text-amber-600 font-semibold'
                            : 'text-slate-400'
                        }`}
                      >
                        {inst.is_paid
                          ? inst.paid_on
                            ? `Paid on ${formatDate(inst.paid_on)}`
                            : 'Marked as Paid'
                          : dueStatus.text}
                      </span>
                    </div>

                    {/* Amount */}
                    <div className="col-span-2">
                      <span className="text-sm font-extrabold text-slate-900 block">
                        {formatMoney(inst.amount)}
                      </span>
                      {inst.principal_amount !== null && inst.principal_amount !== undefined && inst.interest_amount !== null && inst.interest_amount !== undefined && Number(inst.interest_amount) > 0 && (
                        <span className="text-xs text-slate-400 font-medium block">
                          P: {formatMoney(inst.principal_amount)} • I: {formatMoney(inst.interest_amount)}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-2">
                      {inst.is_paid ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Paid
                        </span>
                      ) : dueStatus.variant === 'overdue' ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 inline-flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Overdue
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white text-slate-600 shadow-sm inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="col-span-2 w-full sm:w-auto flex sm:justify-end">
                      {inst.is_paid ? (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleInstallment(inst)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1 w-full sm:w-auto justify-center"
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Undo2 className="w-3.5 h-3.5" />
                              Undo
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleInstallment(inst)}
                          className="bili-btn-primary text-xs py-1.5 px-3.5 shadow-sm font-semibold flex items-center gap-1 w-full sm:w-auto justify-center"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Mark as Paid
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* If no schedule is configured yet, provide 1-click schedule generator */
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Monthly Payment Schedule
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate a complete record of payments until the end of the loan (e.g. 24 months = 24 records).
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0 self-start sm:self-auto">
              No Schedule Yet
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#F6F7F9] space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Installment Term (Number of Months)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {INSTALLMENT_MONTHS_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonths(m)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      selectedMonths === m
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {m} Months {m === 24 ? '⭐ (24 Records)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Monthly Due Day (Day of Month)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={selectedDueDay}
                  onChange={(e) => setSelectedDueDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                  className="bili-input w-full text-sm font-bold bg-white"
                  placeholder="e.g. 20 (Due every 20th)"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Due date will automatically be set on this day every month.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Monthly Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={selectedRate}
                  onChange={(e) => setSelectedRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bili-input w-full text-sm font-bold bg-white"
                  placeholder="0.00%"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[0, 1, 1.5, 2, 3].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSelectedRate(rate)}
                      className={`text-xs font-bold px-2 py-0.5 rounded-md transition-colors ${
                        selectedRate === rate
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white shadow-sm flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Calculated Monthly Share:
                </span>
                <span className="text-2xl font-extrabold text-blue-700 mt-0.5">
                  ₱{previewMonthly} / month
                </span>
                <span className="text-xs text-slate-500 font-medium mt-1">
                  Generates a table of exactly {selectedMonths} monthly payment records
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSettingUpSchedule}
                onClick={handleSetupSchedule}
                className="bili-btn-primary py-3 px-6 text-sm font-semibold shadow-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isSettingUpSchedule
                  ? 'Generating Schedule...'
                  : `Generate ${selectedMonths}-Month Payment Schedule (${selectedMonths} Records)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ad-hoc Repayments List (if any recorded via custom payment) */}
      {loan.payments && loan.payments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Recorded Repayments History
          </h2>
          <div className="bg-white rounded-3xl p-6 shadow-sm space-y-3">
            {loan.payments.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-[#F6F7F9] flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {formatMoney(p.amount)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Paid on {formatDate(p.paid_on)} via {p.payment_method}
                    {p.note && ` • "${p.note}"`}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800">
                  Recorded
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Traceability & Audit Ledger */}
      {loan.transactions && loan.transactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Traceable Activity & Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every credit card charge, downpayment, and repayment linked to this loan is fully audited and traceable.
              </p>
            </div>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              All Transactions →
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm space-y-2.5">
            {loan.transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#F6F7F9] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      tx.kind === 'income'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {tx.note || (tx.kind === 'income' ? 'Repayment Received' : 'Purchase Swiped')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDate(tx.occurred_on)} • Method: {tx.payment_method.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-extrabold ${
                      tx.kind === 'income' ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'} {formatMoney(tx.amount)}
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      tx.kind === 'income'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {tx.kind === 'income' ? 'Repayment In' : 'Card Swipe Out'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      <LoanPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        loan={loan}
      />

      {/* Edit Loan Details Modal */}
      <EditLoanModal
        isOpen={isEditLoanModalOpen}
        onClose={() => setIsEditLoanModalOpen(false)}
        loan={loan}
        contacts={contacts}
        creditCards={creditCards}
      />
    </div>
  );
}
