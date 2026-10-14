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
import { Loan, LoanInstallment, Contact, CreditCard as CreditCardType, Property } from '@/types';
import { formatMoney, formatDate, calculateLoanStatus } from '@/lib/finance/calculations';
import { LoanPaymentModal } from '@/components/Forms/LoanPaymentModal';
import { EditLoanModal } from '@/components/Forms/EditLoanModal';
import { INSTALLMENT_MONTHS_OPTIONS } from '@/lib/constants';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  properties?: Property[];
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
  properties = [],
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
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Loans
        </Link>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setIsEditLoanModalOpen(true)}
            className="gap-1.5"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground" />
            Edit Loan Details
          </Button>

          {loan.status !== 'paid' && (
            <Button
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Record Repayment
            </Button>
          )}
        </div>
      </div>

      {/* Main Loan Overview Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 shadow-card overflow-hidden min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <HandCoins className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {loan.contact?.name || 'Borrower'}
                </h1>
                {loan.is_installment && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {loan.installment_months
                      ? `${loan.installment_months} Months Installment`
                      : 'Open-Ended (Monthly Interest)'}
                  </span>
                )}
                {Number(loan.monthly_interest_rate || 0) > 0 && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 inline-flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    {loan.monthly_interest_rate}% / mo Interest
                  </span>
                )}
                {loan.credit_card && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-foreground inline-flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                    Card Cycle Synced
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {loan.reason || 'Personal loan record'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full self-start whitespace-nowrap ${
              loan.status === 'paid'
                ? 'bg-emerald-500/10 text-emerald-500'
                : loan.status === 'partial'
                ? 'bg-blue-500/10 text-blue-500'
                : 'bg-amber-500/10 text-amber-500'
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
        <div className="p-6 rounded-2xl bg-muted/60 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                Remaining Balance
              </span>
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {formatMoney(loan.balance_remaining)}
              </span>
            </div>

            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                Total Purchase / Amount
              </span>
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {formatMoney(loan.amount)}
              </span>
            </div>

            {Number(loan.downpayment_amount || 0) > 0 ? (
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                  Downpayment Paid
                </span>
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatMoney(loan.downpayment_amount)}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                  Financed Principal
                </span>
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {formatMoney(loan.amount)}
                </span>
              </div>
            )}

            <div>
              <span className="text-xs text-muted-foreground font-medium block">
                Total Repaid So Far
              </span>
              <span className="text-2xl font-bold text-emerald-500">
                {formatMoney(math.paidAmount)}
              </span>
            </div>
          </div>

          {/* Interest Breakdown row if loan has monthly interest */}
          {Number(loan.monthly_interest_rate || 0) > 0 && (
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card shadow-xs flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Monthly Interest Rate</span>
                <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                  {loan.monthly_interest_rate}% / month
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card shadow-xs flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total Interest</span>
                <span className="text-xs font-bold text-foreground">
                  {formatMoney(loan.total_interest || 0)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card shadow-xs flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total Repayable (Principal + Interest)</span>
                <span className="text-xs font-extrabold text-blue-500">
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
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${math.percentPaid}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
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
          <div className="p-4 rounded-2xl bg-muted/60">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Date Lent
            </span>
            <span className="text-sm font-bold text-foreground mt-1 block">
              {formatDate(loan.loaned_on)}
            </span>
          </div>

          {loan.is_installment ? (
            <>
              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Monthly Due Day
                </span>
                <span className="text-sm font-bold text-foreground mt-1 block">
                  Every {getOrdinalSuffix(loan.monthly_due_day || 15)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  {loan.installment_months ? 'Monthly Due Amount' : 'Monthly Interest Due'}
                </span>
                <span className="text-sm font-bold text-blue-500 mt-1 block">
                  {loan.monthly_amount ? formatMoney(loan.monthly_amount) : 'Calculated'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Installment Term
                </span>
                <span className="text-sm font-bold text-foreground mt-1 block">
                  {loan.installment_months ? `${loan.installment_months} Months` : 'No Fixed Term (Open-Ended)'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Interest Rate
                </span>
                <span className="text-sm font-bold text-foreground mt-1 block">
                  {Number(loan.monthly_interest_rate || 0) > 0
                    ? `${loan.monthly_interest_rate}% / month`
                    : '0% (No Interest)'}
                </span>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-2xl bg-muted/60">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Target Return Date
              </span>
              <span className="text-sm font-bold text-foreground mt-1 block">
                {loan.due_date ? formatDate(loan.due_date) : 'Flexible (No set date)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Linked Credit Card & Downpayment Highlights */}
      {Boolean(loan.credit_card || Number(loan.downpayment_amount || 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loan.credit_card && (
            <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-card overflow-hidden min-w-0 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Purchased via Credit Card
                  </span>
                  <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    Cycle Synchronized ⚡
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {loan.credit_card.bank_name} - {loan.credit_card.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Card ending in <span className="font-semibold text-foreground">•••• {loan.credit_card.last_4}</span>
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                    Swiped: {formatMoney(loan.amount)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                    Statement Cutoff: Every {getOrdinalSuffix(loan.credit_card.statement_day)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                    Payment Due: Every {getOrdinalSuffix(loan.credit_card.due_day)}
                  </span>
                  <Link
                    href="/dashboard/cards"
                    className="text-xs font-semibold text-blue-500 hover:underline ml-auto"
                  >
                    View Card Statements →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {Number(loan.downpayment_amount || 0) > 0 ? (
            <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-card overflow-hidden min-w-0 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Initial Downpayment
                  </span>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Settled Upfront ✅
                  </span>
                </div>
                <div className="text-xl font-extrabold text-foreground">
                  {formatMoney(loan.downpayment_amount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Paid on {formatDate(loan.loaned_on)}. Net financed balance: <span className="font-semibold text-foreground">{formatMoney(Number(loan.amount) - Number(loan.downpayment_amount || 0))}</span>.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Borrower Contact & Automated Reminders Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 shadow-card overflow-hidden min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">
                  Borrower Contact & Automated Reminders
                </h2>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    loan.notify_borrower !== false
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {loan.notify_borrower !== false
                    ? '🔔 3 Days Before Due Active'
                    : '🔕 Reminders Paused'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated notification sent once a day 3 days before payment due date to keep repayments on time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => setIsEditingContact(!isEditingContact)}
              className="gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              {isEditingContact ? 'Cancel Edit' : 'Edit Contact'}
            </Button>
          </div>
        </div>

        {/* Inline Contact Editor */}
        {isEditingContact ? (
          <div className="p-5 rounded-2xl bg-muted/60 space-y-4 animate-in fade-in duration-150">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Update Borrower Notification Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Borrower Mobile Number (SMS)
                </label>
                <Input
                  type="tel"
                  placeholder="0917 123 4567"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-10 min-h-0 bg-card text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Borrower Email Address
                </label>
                <Input
                  type="email"
                  placeholder="borrower@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-10 min-h-0 bg-card text-sm"
                />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={editNotify}
                  onChange={(e) => setEditNotify(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Automatically dispatch reminder 3 days before due date (once a day)</span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingContact(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSavingContact}
                  onClick={handleSaveContact}
                >
                  {isSavingContact ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Contact'
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Contact Details View */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Mobile Number
                </span>
                <span className="text-sm font-bold text-foreground mt-1 block">
                  {loan.borrower_phone || (loan as any).contact?.phone || (
                    <span className="text-muted-foreground font-normal italic">None nominated</span>
                  )}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address
                </span>
                <span className="text-sm font-bold text-foreground mt-1 block truncate">
                  {loan.borrower_email || (loan as any).contact?.email || (
                    <span className="text-muted-foreground font-normal italic">None nominated</span>
                  )}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Next Scheduled Alert
                </span>
                <span className="text-sm font-bold text-foreground mt-1 block">
                  {loan.status === 'paid' ? (
                    <span className="text-emerald-500 font-semibold">Loan fully paid</span>
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
                <div className="p-4 rounded-2xl bg-muted/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Quick Alert Dispatch:</span>{' '}
                    Send reminder now or customize the message with live variables before sending.
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      disabled={isSendingReminder !== null || !(loan.borrower_phone || (loan as any).contact?.phone)}
                      onClick={() => handleSendReminder('sms')}
                      className="gap-1.5 font-semibold"
                    >
                      {isSendingReminder === 'sms' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      Send SMS Now
                    </Button>

                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      disabled={isSendingReminder !== null || !(loan.borrower_email || (loan as any).contact?.email)}
                      onClick={() => handleSendReminder('email')}
                      className="gap-1.5 font-semibold"
                    >
                      {isSendingReminder === 'email' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                      Send Email Now
                    </Button>

                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        if (isCustomizingMessage) {
                          setIsCustomizingMessage(false);
                        } else {
                          handleOpenCustomizer('sms');
                        }
                      }}
                      className="bg-card hover:bg-muted shadow-xs gap-1.5 font-semibold text-foreground"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                      {isCustomizingMessage ? 'Close Customizer' : 'Customize & Preview'}
                    </Button>
                  </div>
                </div>

                {/* Inline Message Customizer Drawer */}
                {isCustomizingMessage && (
                  <div className="p-5 rounded-2xl bg-muted/60 space-y-4 animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                          Customize Message for {loan.contact?.name || 'Borrower'}
                        </span>
                        <div className="flex items-center gap-1 p-0.5 bg-card rounded-lg shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleSwitchCustomChannel('sms')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              customChannel === 'sms'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            SMS Text
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSwitchCustomChannel('email')}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              customChannel === 'email'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Email
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetCustomText}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                        Reset to Default
                      </button>
                    </div>

                    {/* Variable Inserter Chips */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                        Tap to Insert Dynamic Variable Value:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {LOAN_TEMPLATE_VARIABLES.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            onClick={() => handleInsertLoanVar(v.key)}
                            className="bg-card hover:bg-muted px-2.5 py-1 rounded-lg text-xs font-medium text-foreground shadow-xs transition-all cursor-pointer"
                            title={`Insert ${currentLoanVariables[v.key]}`}
                          >
                            <span className="font-mono text-primary font-bold text-xs">
                              {v.label}:
                            </span>{' '}
                            <span className="text-muted-foreground text-xs">
                              {currentLoanVariables[v.key] || v.sample}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editable Message Textarea */}
                    <div>
                      <Textarea
                        rows={4}
                        value={customMessageText}
                        onChange={(e) => setCustomMessageText(e.target.value)}
                        placeholder="Write reminder message..."
                        className="bg-card text-sm font-sans leading-relaxed resize-y"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                        <span>
                          Sending to:{' '}
                          <strong className="text-foreground">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCustomizingMessage(false)}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          isSendingReminder !== null ||
                          !customMessageText.trim() ||
                          (customChannel === 'sms'
                            ? !(loan.borrower_phone || (loan as any).contact?.phone)
                            : !(loan.borrower_email || (loan as any).contact?.email))
                        }
                        onClick={() => handleSendReminder(customChannel, customMessageText)}
                        className="gap-1.5 font-semibold"
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
                      </Button>
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
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  Monthly Payment Schedule
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-500">
                  {totalInstallmentsCount} Months • {totalInstallmentsCount} Records
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete breakdown of all {totalInstallmentsCount} monthly records until end of loan. Tap &quot;Mark as Paid&quot; when settled.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsConfiguringSchedule(true)}
                className="gap-1.5 font-semibold text-xs rounded-xl"
              >
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                Change Term / Plan
              </Button>
              <div className="text-xs font-semibold text-muted-foreground bg-muted/60 px-3.5 py-2 rounded-xl">
                Progress: <span className="text-emerald-500 font-bold">{paidInstallmentsCount}</span> / {totalInstallmentsCount} paid
              </div>
            </div>
          </div>

          {/* Reconfigure Schedule Sheet */}
          <Sheet open={isConfiguringSchedule} onOpenChange={setIsConfiguringSchedule}>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  Reconfigure Payment Schedule Terms
                </SheetTitle>
                <SheetDescription>
                  Select new duration to regenerate records
                </SheetDescription>
              </SheetHeader>

              <div className="p-4 rounded-2xl bg-muted/60 space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">
                    Choose Duration (Months)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INSTALLMENT_MONTHS_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMonths(m)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedMonths === m
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-card text-foreground hover:bg-muted'
                        }`}
                      >
                        {m} Months {m === 24 ? '(Popular)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Monthly Due Day
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={selectedDueDay}
                      onChange={(e) => setSelectedDueDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                      className="w-full text-sm bg-card"
                      placeholder="e.g. 20 (Due every 20th)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Monthly Interest Rate (%)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={selectedRate}
                      onChange={(e) => setSelectedRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full text-sm bg-card"
                      placeholder="0.00%"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-card flex flex-col justify-center shadow-xs">
                    <span className="text-xs text-muted-foreground font-medium">New Monthly Due:</span>
                    <span className="text-lg font-extrabold text-primary">
                      ₱{previewMonthly} / month
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Generates exactly {selectedMonths} records until loan end
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsConfiguringSchedule(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isSettingUpSchedule}
                    size="sm"
                    onClick={handleSetupSchedule}
                    className="rounded-xl shadow-sm"
                  >
                    {isSettingUpSchedule ? 'Updating...' : `Update to ${selectedMonths} Months (${selectedMonths} Records)`}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Schedule Table */}
          <div className="bg-card rounded-3xl p-4 sm:p-6 shadow-card space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Month / Term</TableHead>
                  <TableHead>Due & Statement Date</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((inst) => {
                  const dueStatus = getDueStatus(inst.due_date, inst.is_paid);
                  const isLoading = loadingInstallmentId === inst.id;

                  return (
                    <TableRow
                      key={inst.id}
                      className={inst.is_paid ? 'bg-muted/30' : dueStatus.variant === 'overdue' ? 'bg-rose-500/10' : ''}
                    >
                      <TableCell className="font-bold text-foreground">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                            inst.is_paid
                              ? 'bg-success-soft text-success-soft-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {inst.installment_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground block text-sm">
                          Month {inst.installment_number} of {totalInstallmentsCount}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Installment record #{inst.installment_number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold text-foreground">
                          {formatDate(inst.due_date)}
                        </div>
                        {inst.statement_date && (
                          <div className="text-xs text-indigo-500 font-medium">
                            Cutoff: {formatDate(inst.statement_date)}
                          </div>
                        )}
                        <span
                          className={`text-xs font-medium block ${
                            inst.is_paid
                              ? 'text-emerald-500'
                              : dueStatus.variant === 'overdue'
                              ? 'text-rose-500 font-semibold'
                              : dueStatus.variant === 'due-today' || dueStatus.variant === 'due-soon'
                              ? 'text-amber-500 font-semibold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {inst.is_paid
                            ? inst.paid_on
                              ? `Paid on ${formatDate(inst.paid_on)}`
                              : 'Marked as Paid'
                            : dueStatus.text}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-extrabold text-foreground block">
                          {formatMoney(inst.amount)}
                        </span>
                        {inst.principal_amount !== null && inst.principal_amount !== undefined && inst.interest_amount !== null && inst.interest_amount !== undefined && Number(inst.interest_amount) > 0 && (
                          <span className="text-xs text-muted-foreground font-medium block">
                            P: {formatMoney(inst.principal_amount)} • I: {formatMoney(inst.interest_amount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {inst.is_paid ? (
                          <Badge variant="success" className="gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Paid
                          </Badge>
                        ) : dueStatus.variant === 'overdue' ? (
                          <Badge variant="danger" className="gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Overdue
                          </Badge>
                        ) : (
                          <Badge variant="neutral" className="gap-1">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {inst.is_paid ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            disabled={isLoading}
                            onClick={() => handleToggleInstallment(inst)}
                            className="rounded-lg shadow-sm"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Undo2 className="w-3.5 h-3.5" />
                                Undo
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="xs"
                            disabled={isLoading}
                            onClick={() => handleToggleInstallment(inst)}
                            className="rounded-lg shadow-sm"
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
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* If no schedule is configured yet, provide 1-click schedule generator */
        <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 shadow-card overflow-hidden min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                  Monthly Payment Schedule
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {Number(loan.monthly_interest_rate || 0) > 0 && !loan.installment_months
                    ? 'This loan is open-ended with monthly interest payments. If you agree on a fixed duration later (e.g. 12 or 24 months), you can generate a fixed amortization schedule below.'
                    : 'Generate a complete record of payments until the end of the loan (e.g. 24 months = 24 records).'}
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground shrink-0 self-start sm:self-auto">
              {Number(loan.monthly_interest_rate || 0) > 0 && !loan.installment_months
                ? 'Open-Ended (Monthly Interest)'
                : 'No Schedule Yet'}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-muted/60 space-y-5">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Select Installment Term (Number of Months)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {INSTALLMENT_MONTHS_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMonths(m)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedMonths === m
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    {m} Months {m === 24 ? '⭐ (24 Records)' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Monthly Due Day (Day of Month)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={selectedDueDay}
                  onChange={(e) => setSelectedDueDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                  className="h-10 min-h-0 bg-card text-sm font-bold"
                  placeholder="e.g. 20 (Due every 20th)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Due date will automatically be set on this day every month.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Monthly Interest Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={selectedRate}
                  onChange={(e) => setSelectedRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="h-10 min-h-0 bg-card text-sm font-bold"
                  placeholder="0.00%"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[0, 1, 1.5, 2, 3].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSelectedRate(rate)}
                      className={`text-xs font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        selectedRate === rate
                          ? 'bg-indigo-500 text-white'
                          : 'bg-card hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-card shadow-xs flex flex-col justify-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Calculated Monthly Share:
                </span>
                <span className="text-2xl font-extrabold text-blue-500 mt-0.5">
                  ₱{previewMonthly} / month
                </span>
                <span className="text-xs text-muted-foreground font-medium mt-1">
                  Generates a table of exactly {selectedMonths} monthly payment records
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                disabled={isSettingUpSchedule}
                onClick={handleSetupSchedule}
                className="gap-2 font-semibold"
              >
                <Sparkles className="w-4 h-4" />
                {isSettingUpSchedule
                  ? 'Generating Schedule...'
                  : `Generate ${selectedMonths}-Month Payment Schedule (${selectedMonths} Records)`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ad-hoc Repayments List (if any recorded via custom payment) */}
      {loan.payments && loan.payments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">
            Recorded Repayments History
          </h2>
          <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-card space-y-3">
            {loan.payments.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-muted/60 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {formatMoney(p.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Paid on {formatDate(p.paid_on)} via {p.payment_method}
                    {p.note && ` • "${p.note}"`}
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
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
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Traceable Activity & Ledger
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every credit card charge, downpayment, and repayment linked to this loan is fully audited and traceable.
              </p>
            </div>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-semibold text-blue-500 hover:underline"
            >
              All Transactions →
            </Link>
          </div>

          <div className="bg-card text-card-foreground rounded-3xl p-4 sm:p-6 shadow-card space-y-2.5">
            {loan.transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-muted/60 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      tx.kind === 'income'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {tx.note || (tx.kind === 'income' ? 'Repayment Received' : 'Purchase Swiped')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(tx.occurred_on)} • Method: {tx.payment_method.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-extrabold ${
                      tx.kind === 'income' ? 'text-emerald-500' : 'text-foreground'
                    }`}
                  >
                    {tx.kind === 'income' ? '+' : '-'} {formatMoney(tx.amount)}
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      tx.kind === 'income'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
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
        properties={properties}
        creditCards={creditCards}
      />
    </div>
  );
}
