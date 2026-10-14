'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HandCoins,
  Receipt,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Send,
  Plus,
  ArrowRight,
  TrendingUp,
  Percent,
  Phone,
  Mail,
  CreditCard as CreditCardIcon,
  ChevronRight,
  Loader2,
  X,
  MessageSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loan, BillSplit, Contact, CreditCard, Property } from '@/types';
import { formatMoney, formatDate } from '@/lib/finance/calculations';
import { toggleLoanInstallmentPaidAction, sendLoanBorrowerReminderAction } from '@/app/actions/loans';
import { toggleParticipantPaidAction, sendSplitParticipantReminderAction } from '@/app/actions/splits';
import { cn } from '@/lib/utils';
import { LoanModal } from '@/components/Forms/LoanModal';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';

interface ReceivablesClientProps {
  initialLoans: Loan[];
  initialSplits: BillSplit[];
  contacts: Contact[];
  creditCards: CreditCard[];
  properties?: Property[];
}

type TabMode = 'all' | 'debtors' | 'loans' | 'splits';
type StatusFilter = 'all' | 'active' | 'overdue' | 'due_month' | 'settled';

interface DebtorRollup {
  contactId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  totalOwed: number;
  totalPaid: number;
  totalOriginated: number;
  loans: Loan[];
  splitShares: Array<{
    split: BillSplit;
    participantId: string;
    shareAmount: number;
    isPaid: boolean;
    paidOn?: string | null;
  }>;
}

export function ReceivablesClient({
  initialLoans,
  initialSplits,
  contacts,
  creditCards,
  properties = [],
}: ReceivablesClientProps) {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [splits, setSplits] = useState<BillSplit[]>(initialSplits);
  const [activeTab, setActiveTab] = useState<TabMode>('debtors');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemsVisibleCount, setItemsVisibleCount] = useState<number>(15);
  const [debtorsVisibleCount, setDebtorsVisibleCount] = useState<number>(10);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedContactIdForLoan, setSelectedContactIdForLoan] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // Loading states for quick settlement actions
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Quick Reminder Modal State
  const [reminderModalData, setReminderModalData] = useState<{
    isOpen: boolean;
    contactName: string;
    phone?: string | null;
    email?: string | null;
    amount: number;
    title: string;
    loanId?: string;
    participantId?: string;
  } | null>(null);

  const [reminderChannel, setReminderChannel] = useState<'sms' | 'email'>('sms');
  const [customMessage, setCustomMessage] = useState('');
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // Keep state in sync if initial props change
  React.useEffect(() => {
    setLoans(initialLoans);
    setSplits(initialSplits);
  }, [initialLoans, initialSplits]);

  // Current date markers
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];

  // ==========================================
  // Executive Financial Metrics Calculation
  // ==========================================
  const metrics = useMemo(() => {
    // 1. Loans outstanding
    const loansOutstanding = loans.reduce(
      (sum, l) => sum + Math.max(0, Number(l.balance_remaining || 0)),
      0
    );

    // 2. Bill splits outstanding (sum of unpaid shares across all splits)
    let splitsOutstanding = 0;
    let splitsCollectedMonth = 0;
    splits.forEach((s) => {
      (s.participants || []).forEach((p) => {
        if (!p.is_paid) {
          splitsOutstanding += Number(p.share_amount || 0);
        } else if (p.paid_on) {
          const paidDate = new Date(p.paid_on);
          if (
            paidDate.getFullYear() === currentYear &&
            paidDate.getMonth() === currentMonth
          ) {
            splitsCollectedMonth += Number(p.share_amount || 0);
          }
        }
      });
    });

    const totalOutstanding = loansOutstanding + splitsOutstanding;

    // 3. Due this month
    let dueThisMonth = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let collectedThisMonth = splitsCollectedMonth;

    loans.forEach((l) => {
      // Check installment rows
      if (l.is_installment && Array.isArray(l.installments) && l.installments.length > 0) {
        l.installments.forEach((inst) => {
          const instDueDate = new Date(inst.due_date);
          instDueDate.setHours(0, 0, 0, 0);

          if (!inst.is_paid) {
            // Is it overdue?
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (instDueDate < today) {
              overdueAmount += Number(inst.amount || 0);
              overdueCount += 1;
            } else if (
              instDueDate.getFullYear() === currentYear &&
              instDueDate.getMonth() === currentMonth
            ) {
              dueThisMonth += Number(inst.amount || 0);
            }
          } else if (inst.paid_on) {
            const pDate = new Date(inst.paid_on);
            if (
              pDate.getFullYear() === currentYear &&
              pDate.getMonth() === currentMonth
            ) {
              collectedThisMonth += Number(inst.amount || 0);
            }
          }
        });
      } else if (l.status !== 'paid') {
        // Flexible loan
        if (l.due_date) {
          const due = new Date(l.due_date);
          due.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (due < today) {
            overdueAmount += Number(l.balance_remaining || 0);
            overdueCount += 1;
          } else if (
            due.getFullYear() === currentYear &&
            due.getMonth() === currentMonth
          ) {
            dueThisMonth += Number(l.balance_remaining || 0);
          }
        }
      }
    });

    // Add splits overdue (splits occurred > 14 days ago without payment)
    splits.forEach((s) => {
      const occDate = new Date(s.occurred_on);
      const diffDays = Math.ceil((now.getTime() - occDate.getTime()) / (1000 * 60 * 60 * 24));
      (s.participants || []).forEach((p) => {
        if (!p.is_paid && diffDays > 14) {
          overdueAmount += Number(p.share_amount || 0);
          overdueCount += 1;
        } else if (!p.is_paid) {
          dueThisMonth += Number(p.share_amount || 0);
        }
      });
    });

    // 4. Total interest yield
    const totalInterestYield = loans.reduce(
      (sum, l) => sum + Number(l.total_interest || 0),
      0
    );

    return {
      totalOutstanding,
      loansOutstanding,
      splitsOutstanding,
      dueThisMonth,
      overdueAmount,
      overdueCount,
      collectedThisMonth,
      totalInterestYield,
    };
  }, [loans, splits, currentYear, currentMonth, now]);

  // ==========================================
  // Grouping by Debtor / Person Rollup
  // ==========================================
  const debtorRollups = useMemo(() => {
    const map = new Map<string, DebtorRollup>();

    // Process loans
    loans.forEach((l) => {
      const contact = l.contact;
      const contactId = l.contact_id || 'unknown';
      const name = contact?.name || 'Unknown Contact';

      if (!map.has(contactId)) {
        map.set(contactId, {
          contactId,
          name,
          phone: l.borrower_phone || contact?.phone,
          email: l.borrower_email || contact?.email,
          totalOwed: 0,
          totalPaid: 0,
          totalOriginated: 0,
          loans: [],
          splitShares: [],
        });
      }

      const debtor = map.get(contactId)!;
      debtor.loans.push(l);
      const orig = Number(l.amount || 0) + Number(l.total_interest || 0);
      const remaining = Number(l.balance_remaining || 0);
      debtor.totalOriginated += orig;
      debtor.totalOwed += remaining;
      debtor.totalPaid += Math.max(0, orig - remaining);
    });

    // Process bill splits
    splits.forEach((s) => {
      (s.participants || []).forEach((p) => {
        const contact = p.contact;
        const contactId = p.contact_id || 'unknown';
        const name = contact?.name || 'Unknown Contact';

        if (!map.has(contactId)) {
          map.set(contactId, {
            contactId,
            name,
            phone: contact?.phone,
            email: contact?.email,
            totalOwed: 0,
            totalPaid: 0,
            totalOriginated: 0,
            loans: [],
            splitShares: [],
          });
        }

        const debtor = map.get(contactId)!;
        const share = Number(p.share_amount || 0);
        debtor.totalOriginated += share;
        if (!p.is_paid) {
          debtor.totalOwed += share;
        } else {
          debtor.totalPaid += share;
        }

        debtor.splitShares.push({
          split: s,
          participantId: p.id,
          shareAmount: share,
          isPaid: p.is_paid,
          paidOn: p.paid_on,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalOwed - a.totalOwed);
  }, [loans, splits]);

  // ==========================================
  // Unified Flat Items List for Chronological Feed
  // ==========================================
  interface UnifiedItem {
    id: string;
    kind: 'loan' | 'split';
    title: string;
    debtorName: string;
    debtorPhone?: string | null;
    debtorEmail?: string | null;
    contactId?: string;
    amount: number;
    balanceRemaining: number;
    dueDate?: string | null;
    isPaid: boolean;
    isOverdue: boolean;
    dueText: string;
    occurredOn: string;
    creditCard?: CreditCard | null;
    rawLoan?: Loan;
    rawSplit?: BillSplit;
    rawParticipantId?: string;
  }

  const unifiedItems: UnifiedItem[] = useMemo(() => {
    const list: UnifiedItem[] = [];

    // 1. Add Loans
    loans.forEach((l) => {
      const isPaid = l.status === 'paid';
      const balance = Number(l.balance_remaining || 0);
      let targetDue = l.due_date;

      // If installment, next unpaid installment date
      if (l.is_installment && Array.isArray(l.installments)) {
        const nextUnpaid = l.installments.find((i) => !i.is_paid);
        if (nextUnpaid) {
          targetDue = nextUnpaid.due_date;
        }
      }

      let isOverdue = false;
      let dueText = 'Flexible';

      if (targetDue && !isPaid) {
        const dueObj = new Date(targetDue);
        dueObj.setHours(0, 0, 0, 0);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          isOverdue = true;
          dueText = `Overdue by ${Math.abs(diffDays)}d`;
        } else if (diffDays === 0) {
          dueText = 'Due Today';
        } else if (diffDays <= 7) {
          dueText = `Due in ${diffDays}d`;
        } else {
          dueText = `Due ${formatDate(targetDue)}`;
        }
      } else if (isPaid) {
        dueText = 'Settled';
      }

      list.push({
        id: `loan-${l.id}`,
        kind: 'loan',
        title: l.reason || 'Personal Loan',
        debtorName: l.contact?.name || 'Borrower',
        debtorPhone: l.borrower_phone || l.contact?.phone,
        debtorEmail: l.borrower_email || l.contact?.email,
        contactId: l.contact_id,
        amount: Number(l.amount || 0) + Number(l.total_interest || 0),
        balanceRemaining: balance,
        dueDate: targetDue,
        isPaid,
        isOverdue,
        dueText,
        occurredOn: l.loaned_on,
        creditCard: l.credit_card,
        rawLoan: l,
      });
    });

    // 2. Add Bill Split Participants
    splits.forEach((s) => {
      (s.participants || []).forEach((p) => {
        const occDate = new Date(s.occurred_on);
        occDate.setHours(0, 0, 0, 0);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((todayObj.getTime() - occDate.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = !p.is_paid && diffDays > 14;

        let dueText = p.is_paid ? 'Settled' : isOverdue ? `${diffDays}d ago` : 'Split Share';

        list.push({
          id: `split-${p.id}`,
          kind: 'split',
          title: s.title,
          debtorName: p.contact?.name || 'Friend',
          debtorPhone: p.contact?.phone,
          debtorEmail: p.contact?.email,
          contactId: p.contact_id,
          amount: Number(p.share_amount || 0),
          balanceRemaining: p.is_paid ? 0 : Number(p.share_amount || 0),
          dueDate: s.occurred_on,
          isPaid: p.is_paid,
          isOverdue,
          dueText,
          occurredOn: s.occurred_on,
          creditCard: s.credit_card,
          rawSplit: s,
          rawParticipantId: p.id,
        });
      });
    });

    return list.sort((a, b) => {
      // Sort: Overdue first, then by remaining balance descending
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.balanceRemaining - a.balanceRemaining;
    });
  }, [loans, splits]);

  // ==========================================
  // Filtered Items based on Tab & Status & Search
  // ==========================================
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // 1. Tab filter
      if (activeTab === 'loans' && item.kind !== 'loan') return false;
      if (activeTab === 'splits' && item.kind !== 'split') return false;

      // 2. Status filter
      if (statusFilter === 'active' && item.isPaid) return false;
      if (statusFilter === 'settled' && !item.isPaid) return false;
      if (statusFilter === 'overdue' && (!item.isOverdue || item.isPaid)) return false;
      if (statusFilter === 'due_month') {
        if (item.isPaid || !item.dueDate) return false;
        const d = new Date(item.dueDate);
        if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.debtorName.toLowerCase().includes(q);
        const matchesTitle = item.title.toLowerCase().includes(q);
        return matchesName || matchesTitle;
      }

      return true;
    });
  }, [unifiedItems, activeTab, statusFilter, searchQuery, currentYear, currentMonth]);

  // Filtered Debtors
  const filteredDebtors = useMemo(() => {
    return debtorRollups.filter((d) => {
      if (statusFilter === 'active' && d.totalOwed <= 0) return false;
      if (statusFilter === 'settled' && d.totalOwed > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.phone && d.phone.includes(q)) ||
          (d.email && d.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [debtorRollups, statusFilter, searchQuery]);

  // ==========================================
  // Actions: Toggle / Quick Settle
  // ==========================================
  const handleQuickSettleItem = async (item: UnifiedItem) => {
    setLoadingActionId(item.id);

    if (item.kind === 'split' && item.rawSplit && item.rawParticipantId) {
      const nextPaid = !item.isPaid;
      // Optimistic update
      setSplits((prev) =>
        prev.map((s) =>
          s.id === item.rawSplit!.id
            ? {
                ...s,
                participants: (s.participants || []).map((p) =>
                  p.id === item.rawParticipantId
                    ? {
                        ...p,
                        is_paid: nextPaid,
                        paid_on: nextPaid ? todayStr : null,
                      }
                    : p
                ),
              }
            : s
        )
      );

      const res = await toggleParticipantPaidAction(
        item.rawSplit.id,
        item.rawParticipantId,
        nextPaid
      );

      setLoadingActionId(null);
      if (res?.error) {
        toast.error(res.error);
        router.refresh();
      } else {
        toast.success(
          nextPaid
            ? `Marked ${item.debtorName}'s share of "${item.title}" as settled! ✅`
            : `Marked ${item.debtorName}'s share as unpaid.`
        );
        startTransition(() => router.refresh());
      }
    } else if (item.kind === 'loan' && item.rawLoan) {
      // If loan is installment, find next unpaid installment and toggle it
      const rawLoan = item.rawLoan;
      if (rawLoan.is_installment && Array.isArray(rawLoan.installments)) {
        const unpaid = rawLoan.installments.find((i) => !i.is_paid);
        if (unpaid) {
          const res = await toggleLoanInstallmentPaidAction(rawLoan.id, unpaid.id, true);
          setLoadingActionId(null);
          if (res?.error) {
            toast.error(res.error);
          } else {
            toast.success(
              `Month #${unpaid.installment_number} of "${rawLoan.reason}" marked as paid! ✅`
            );
            startTransition(() => router.refresh());
          }
          return;
        }
      }

      // If flexible or no unpaid installments left, redirect to details for record repayment
      setLoadingActionId(null);
      router.push(`/dashboard/loans/${rawLoan.id}`);
    }
  };

  // ==========================================
  // Quick Reminder Dispatch Action
  // ==========================================
  const handleOpenReminderModal = (item: {
    contactName: string;
    phone?: string | null;
    email?: string | null;
    amount: number;
    title: string;
    loanId?: string;
    participantId?: string;
  }) => {
    setReminderModalData({
      isOpen: true,
      ...item,
    });
    setReminderChannel(item.phone ? 'sms' : 'email');
    setCustomMessage(
      `Hi ${item.contactName}, friendly reminder for ${item.title} (${formatMoney(item.amount)}). Thanks!`
    );
  };

  const handleSendReminder = async () => {
    if (!reminderModalData) return;
    setIsSendingReminder(true);

    let res: any = null;
    if (reminderModalData.loanId) {
      res = await sendLoanBorrowerReminderAction(
        reminderModalData.loanId,
        reminderChannel,
        customMessage
      );
    } else if (reminderModalData.participantId) {
      res = await sendSplitParticipantReminderAction({
        participantId: reminderModalData.participantId,
        channel: reminderChannel,
        customMessage,
      });
    }

    setIsSendingReminder(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(res?.message || 'Reminder dispatched successfully!');
      setReminderModalData(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <HandCoins className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Receivables Hub
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Complete command center for all money owed to you — friendly personal loans, installment plans, and shared bill splits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <Link
            href="/dashboard/splits"
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            <Receipt className="w-4 h-4 text-muted-foreground" />
            Split a Bill
          </Link>

          <Button
            size="sm"
            onClick={() => {
              setSelectedContactIdForLoan('');
              setIsLoanModalOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Record Receivable / Loan
          </Button>
        </div>
      </div>

      {/* 1. Executive Top Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Outstanding */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card hover:shadow-lift transition-all flex flex-col justify-between col-span-2 sm:col-span-1 overflow-hidden min-w-0">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Total Receivables
            </span>
            <div className="text-2xl font-bold text-foreground mt-1 leading-tight" title={formatMoney(metrics.totalOutstanding)}>
              {formatMoney(metrics.totalOutstanding)}
            </div>
          </div>
          <div className="text-2xs sm:text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-1 flex-wrap">
            <span>Loans: {formatMoney(metrics.loansOutstanding)}</span>
            <span>•</span>
            <span>Splits: {formatMoney(metrics.splitsOutstanding)}</span>
          </div>
        </div>

        {/* Due This Month */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card hover:shadow-lift transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Due This Month
            </span>
            <div className="text-2xl font-bold text-blue-500 mt-1 leading-tight" title={formatMoney(metrics.dueThisMonth)}>
              {formatMoney(metrics.dueThisMonth)}
            </div>
          </div>
          <div className="text-2xs sm:text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-1">
            <Clock className="w-3 h-3 text-blue-500 shrink-0" />
            <span className="truncate">Scheduled collections</span>
          </div>
        </div>

        {/* Overdue / Action Needed */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card hover:shadow-lift transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Overdue / At Risk
            </span>
            <div
              className={`text-2xl font-bold ${
                metrics.overdueAmount > 0 ? 'text-rose-500' : 'text-foreground'
              } mt-1 leading-tight`}
              title={formatMoney(metrics.overdueAmount)}
            >
              {formatMoney(metrics.overdueAmount)}
            </div>
          </div>
          <div className="text-2xs sm:text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-1">
            {metrics.overdueCount > 0 ? (
              <span className="text-rose-500 font-semibold flex items-center gap-1 truncate">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {metrics.overdueCount} items past due
              </span>
            ) : (
              <span className="text-emerald-500 font-medium flex items-center gap-1 truncate">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                Zero overdue
              </span>
            )}
          </div>
        </div>

        {/* Collected This Month */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card hover:shadow-lift transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Collected This Month
            </span>
            <div className="text-2xl font-bold text-emerald-500 mt-1 leading-tight" title={formatMoney(metrics.collectedThisMonth)}>
              {formatMoney(metrics.collectedThisMonth)}
            </div>
          </div>
          <div className="text-2xs sm:text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-1">
            <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="truncate">Recovered capital</span>
          </div>
        </div>

        {/* Total Interest Yield */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card hover:shadow-lift transition-all flex flex-col justify-between overflow-hidden min-w-0">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
              Interest Accrued
            </span>
            <div className="text-2xl font-bold text-indigo-500 mt-1 leading-tight" title={formatMoney(metrics.totalInterestYield)}>
              {formatMoney(metrics.totalInterestYield)}
            </div>
          </div>
          <div className="text-2xs sm:text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-1">
            <Percent className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate">Yield on loans</span>
          </div>
        </div>
      </div>

      {/* 2. Visual Aging Runway */}
      {metrics.totalOutstanding > 0 && (
        <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Receivables Aging & Cash Flow Inflow Runway
              </h2>
              <p className="text-xs text-muted-foreground">
                Categorization of money owed based on payment urgency and scheduled return dates.
              </p>
            </div>
            <span className="text-xs font-bold text-foreground bg-muted px-3 py-1 rounded-full self-start sm:self-auto">
              {debtorRollups.filter((d) => d.totalOwed > 0).length} People Currently Owe You
            </span>
          </div>

          {/* Segmented Visual Bar */}
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex">
            {metrics.overdueAmount > 0 && (
              <div
                className="h-full bg-rose-500 transition-all"
                style={{
                  width: `${Math.max(
                    5,
                    (metrics.overdueAmount / metrics.totalOutstanding) * 100
                  )}%`,
                }}
                title={`Overdue: ${formatMoney(metrics.overdueAmount)}`}
              />
            )}
            {metrics.dueThisMonth > 0 && (
              <div
                className="h-full bg-blue-500 transition-all"
                style={{
                  width: `${Math.max(
                    5,
                    (metrics.dueThisMonth / metrics.totalOutstanding) * 100
                  )}%`,
                }}
                title={`Due This Month: ${formatMoney(metrics.dueThisMonth)}`}
              />
            )}
            <div
              className="h-full bg-muted-foreground/30 transition-all flex-1"
              title="Future Amortizations & Open Balances"
            />
          </div>

          {/* Runway Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-muted-foreground font-medium">Overdue:</span>
              <strong className="text-rose-500">{formatMoney(metrics.overdueAmount)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <span className="text-muted-foreground font-medium">Due This Month:</span>
              <strong className="text-blue-500">{formatMoney(metrics.dueThisMonth)}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/50 shrink-0" />
              <span className="text-muted-foreground font-medium">Future Amortizations:</span>
              <strong className="text-foreground">
                {formatMoney(
                  Math.max(0, metrics.totalOutstanding - metrics.dueThisMonth - metrics.overdueAmount)
                )}
              </strong>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-muted-foreground font-medium">Recovered:</span>
              <strong className="text-emerald-500">{formatMoney(metrics.collectedThisMonth)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs, Search & Filter Controls */}
      <div className="space-y-4">
        {/* Main Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-2xl self-start overflow-x-auto no-scrollbar max-w-full shrink-0">
            <button
              onClick={() => setActiveTab('debtors')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'debtors'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Grouped by Entity ({debtorRollups.length})
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Line Items ({unifiedItems.length})
            </button>

            <button
              onClick={() => setActiveTab('loans')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'loans'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <HandCoins className="w-3.5 h-3.5" />
              Loans ({loans.length})
            </button>

            <button
              onClick={() => setActiveTab('splits')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'splits'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Bill Splits ({splits.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search person or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs h-10 min-h-0 bg-muted rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>

          {[
            { key: 'active', label: 'Active Outstanding' },
            { key: 'due_month', label: 'Due This Month' },
            { key: 'overdue', label: 'Overdue Only' },
            { key: 'settled', label: 'Settled' },
            { key: 'all', label: 'All Records' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key as StatusFilter)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === s.key
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground shadow-xs'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tab Content: DEBTOR ROLLUP DIRECTORY */}
      {activeTab === 'debtors' && (
        <div className="space-y-4">
          {filteredDebtors.length === 0 ? (
            <div className="bg-card text-card-foreground rounded-3xl p-12 text-center space-y-3 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No debtors match your filter</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try selecting &quot;All Records&quot; or clearing your search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDebtors.slice(0, debtorsVisibleCount).map((debtor) => {
                const percentPaid =
                  debtor.totalOriginated > 0
                    ? Math.round((debtor.totalPaid / debtor.totalOriginated) * 100)
                    : 100;
                const isFullySettled = debtor.totalOwed <= 0;

                return (
                  <div
                    key={debtor.contactId}
                    className="bg-card text-card-foreground rounded-3xl p-6 shadow-card space-y-4 transition-all hover:shadow-md overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={
                          debtor.contactId && debtor.contactId !== 'unknown'
                            ? `/dashboard/receivables/${debtor.contactId}`
                            : '#'
                        }
                        className="flex items-start gap-3 min-w-0 flex-1 group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-extrabold text-base shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                          {debtor.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-base font-semibold leading-snug text-foreground whitespace-normal break-words group-hover:text-primary transition-colors">
                              {debtor.name}
                            </h3>
                            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {debtor.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {debtor.phone}
                              </span>
                            )}
                            {debtor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span>{debtor.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full shrink-0 ${
                          isFullySettled
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-indigo-500/10 text-indigo-500'
                        }`}
                      >
                        {isFullySettled ? 'All Settled ✅' : `${formatMoney(debtor.totalOwed)} Owed`}
                      </span>
                    </div>

                    {/* Balance & Progress */}
                    <div className="p-4 rounded-2xl bg-muted/60 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground font-medium">Repayment Progress:</span>
                        <span className="font-bold text-foreground">
                          {percentPaid}% ({formatMoney(debtor.totalPaid)} of{' '}
                          {formatMoney(debtor.totalOriginated)})
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>

                      {/* Items breakdown pills */}
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                        {debtor.loans.length > 0 && (
                          <span className="text-muted-foreground font-medium bg-card px-2.5 py-1 rounded-lg shadow-xs">
                            {debtor.loans.length} Loan{debtor.loans.length === 1 ? '' : 's'}
                          </span>
                        )}
                        {debtor.splitShares.length > 0 && (
                          <span className="text-muted-foreground font-medium bg-card px-2.5 py-1 rounded-lg shadow-xs">
                            {debtor.splitShares.length} Bill Split{debtor.splitShares.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Breakdown items list under this Entity */}
                    <div
                      style={{ maxHeight: '240px', overflowY: 'auto' }}
                      className="pr-1 space-y-2 bili-scrollbar overscroll-contain"
                    >
                      {debtor.loans.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-center justify-between text-xs p-3 rounded-2xl bg-muted/60 hover:bg-muted/80 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md text-xs uppercase tracking-wider shrink-0 ${
                                l.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-indigo-500/10 text-indigo-500'
                              }`}
                            >
                              {l.status === 'paid' ? 'Paid' : 'Advance'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-foreground truncate block">
                                {l.reason || 'Receivable Advance'}
                              </span>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span>
                                  {l.due_date ? `Due ${formatDate(l.due_date)}` : `Lent ${formatDate(l.loaned_on)}`}
                                </span>
                                {Number(l.monthly_interest_rate || 0) > 0 && (
                                  <span className="text-indigo-500 font-semibold">
                                    • {l.monthly_interest_rate}%/mo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              <span
                                className={`font-extrabold text-sm block ${
                                  l.status === 'paid' ? 'text-emerald-500' : 'text-foreground'
                                }`}
                              >
                                {formatMoney(l.balance_remaining)}
                              </span>
                              {Number(l.amount) > Number(l.balance_remaining) && l.status !== 'paid' && (
                                <span className="text-xs text-muted-foreground block">
                                  of {formatMoney(Number(l.amount))}
                                </span>
                              )}
                            </div>
                            <Link
                              href={`/dashboard/loans/${l.id}`}
                              className="p-1.5 rounded-xl text-blue-500 hover:bg-muted transition-colors"
                              title="View Details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      ))}

                      {debtor.splitShares.map((s) => (
                        <div
                          key={s.participantId}
                          className="flex items-center justify-between text-xs p-3 rounded-2xl bg-muted/60 hover:bg-muted/80 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md text-xs uppercase tracking-wider shrink-0 ${
                                s.isPaid
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}
                            >
                              {s.isPaid ? 'Paid' : 'Split'}
                            </span>
                            <div className="min-w-0">
                              <span className="font-bold text-foreground truncate block">
                                {s.split.title}
                              </span>
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {formatDate(s.split.occurred_on)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <span
                              className={`font-extrabold text-sm block ${
                                s.isPaid ? 'text-emerald-500' : 'text-foreground'
                              }`}
                            >
                              {s.isPaid ? 'Paid' : formatMoney(s.shareAmount)}
                            </span>
                            <Link
                              href="/dashboard/splits"
                              className="p-1.5 rounded-xl text-blue-500 hover:bg-muted transition-colors"
                              title="View Split Details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Row */}
                    <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                      <Link
                        href={
                          debtor.contactId && debtor.contactId !== 'unknown'
                            ? `/dashboard/receivables/${debtor.contactId}`
                            : '#'
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer group"
                      >
                        <span>View All Details</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="soft"
                          onClick={() => {
                            setSelectedContactIdForLoan(debtor.contactId);
                            setIsLoanModalOpen(true);
                          }}
                          className="text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 font-semibold gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Advance
                        </Button>

                        {!isFullySettled && (debtor.phone || debtor.email) && (
                          <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            onClick={() =>
                              handleOpenReminderModal({
                                contactName: debtor.name,
                                phone: debtor.phone,
                                email: debtor.email,
                                amount: debtor.totalOwed,
                                title: 'outstanding receivables',
                                loanId: debtor.loans[0]?.id,
                                participantId: debtor.splitShares.find((s) => !s.isPaid)?.participantId,
                              })
                            }
                            className="font-semibold gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5 text-blue-500" />
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lazy Load Debtors Button */}
          {filteredDebtors.length > debtorsVisibleCount && (
            <div className="pt-3 text-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDebtorsVisibleCount((prev) => prev + 10)}
              >
                Load More Debtors ({filteredDebtors.length - debtorsVisibleCount} remaining)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Showing {Math.min(debtorsVisibleCount, filteredDebtors.length)} of {filteredDebtors.length} debtors
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab Content: ALL RECEIVABLES, LOANS, SPLITS FEED */}
      {activeTab !== 'debtors' && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-card text-card-foreground rounded-3xl p-12 text-center space-y-3 shadow-card">
              <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                <HandCoins className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">No receivables found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {statusFilter !== 'all'
                  ? 'Try selecting a different status filter above to view more items.'
                  : 'Start tracking money owed by recording a loan or splitting a bill.'}
              </p>
            </div>
          ) : (
            <div className="bg-card text-card-foreground rounded-3xl p-4 sm:p-6 shadow-card space-y-3">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Debtor & Title</div>
                <div className="col-span-3">Due / Date</div>
                <div className="col-span-3">Amount & Balance</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {filteredItems.slice(0, itemsVisibleCount).map((item) => {
                  const isLoading = loadingActionId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl p-4 sm:px-4 sm:py-3.5 transition-all flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:gap-4 items-start sm:items-center ${
                        item.isPaid
                          ? 'bg-muted/40'
                          : item.isOverdue
                          ? 'bg-rose-500/10'
                          : 'bg-muted/70'
                      }`}
                    >
                      {/* Debtor & Title */}
                      <div className="col-span-4 flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            item.kind === 'loan'
                              ? 'bg-indigo-500/10 text-indigo-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {item.kind === 'loan' ? (
                            <HandCoins className="w-5 h-5" />
                          ) : (
                            <Receipt className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.contactId ? (
                              <Link
                                href={`/dashboard/receivables/${item.contactId}`}
                                className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate"
                                title="View entity statement & details"
                              >
                                {item.debtorName}
                              </Link>
                            ) : (
                              <span className="text-sm font-bold text-foreground truncate">
                                {item.debtorName}
                              </span>
                            )}
                            <span
                              className={`text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                item.kind === 'loan'
                                  ? 'bg-indigo-500/10 text-indigo-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}
                            >
                              {item.kind === 'loan' ? 'Loan' : 'Bill Split'}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                            <span>{item.title}</span>
                            {item.creditCard && (
                              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                • <CreditCardIcon className="w-3 h-3 text-muted-foreground" />
                                {item.creditCard.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Due / Date */}
                      <div className="col-span-3">
                        <div className="text-xs font-semibold text-foreground">
                          {formatDate(item.dueDate || item.occurredOn)}
                        </div>
                        <span
                          className={`text-xs font-medium block mt-0.5 ${
                            item.isPaid
                              ? 'text-emerald-500 font-bold'
                              : item.isOverdue
                              ? 'text-rose-500 font-bold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item.dueText}
                        </span>
                      </div>

                      {/* Amount & Balance */}
                      <div className="col-span-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-extrabold text-foreground">
                            {formatMoney(item.balanceRemaining)}
                          </span>
                          {!item.isPaid && item.balanceRemaining !== item.amount && (
                            <span className="text-xs text-muted-foreground">
                              of {formatMoney(item.amount)}
                            </span>
                          )}
                        </div>

                        {item.rawLoan && Number(item.rawLoan.monthly_interest_rate || 0) > 0 && (
                          <span className="text-xs font-semibold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            {item.rawLoan.monthly_interest_rate}% / mo Interest
                          </span>
                        )}
                      </div>

                      {/* Action */}
                      <div className="col-span-2 w-full sm:w-auto flex items-center sm:justify-end gap-2">
                        {item.kind === 'split' ? (
                          <Button
                            type="button"
                            size="xs"
                            variant={item.isPaid ? 'secondary' : 'default'}
                            disabled={isLoading}
                            onClick={() => handleQuickSettleItem(item)}
                            className="w-full sm:w-auto gap-1"
                          >
                            {isLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : item.isPaid ? (
                              'Mark Unpaid'
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Settle Share
                              </>
                            )}
                          </Button>
                        ) : (
                          <Link
                            href={`/dashboard/loans/${item.rawLoan?.id}`}
                            className={cn(buttonVariants({ variant: 'secondary', size: 'xs' }), "w-full sm:w-auto gap-1")}
                          >
                            Manage
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
                        )}

                        {!item.isPaid && (item.debtorPhone || item.debtorEmail) && (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenReminderModal({
                                contactName: item.debtorName,
                                phone: item.debtorPhone,
                                email: item.debtorEmail,
                                amount: item.balanceRemaining,
                                title: item.title,
                                loanId: item.rawLoan?.id,
                                participantId: item.rawParticipantId,
                              })
                            }
                            className="p-1.5 rounded-xl bg-card hover:bg-accent text-muted-foreground hover:text-foreground shadow-xs transition-colors shrink-0"
                            title="Send Payment Reminder"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lazy Load Records Button */}
              {filteredItems.length > itemsVisibleCount && (
                <div className="pt-3 text-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setItemsVisibleCount((prev) => prev + 15)}
                  >
                    Load More Records ({filteredItems.length - itemsVisibleCount} remaining)
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Showing {Math.min(itemsVisibleCount, filteredItems.length)} of {filteredItems.length} records
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Reminder Modal */}
      <ResponsiveDialog
        open={Boolean(reminderModalData)}
        onOpenChange={(open) => {
          if (!open) setReminderModalData(null);
        }}
      >
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader className="pr-10 sm:pr-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <ResponsiveDialogTitle className="truncate">
                  Send Friendly Reminder
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="truncate">
                  To {reminderModalData?.contactName} ({reminderModalData ? formatMoney(reminderModalData.amount) : ''})
                </ResponsiveDialogDescription>
              </div>
            </div>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="space-y-4">
            {/* Channel Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl">
              <Button
                type="button"
                size="sm"
                variant={reminderChannel === 'sms' ? 'default' : 'ghost'}
                onClick={() => setReminderChannel('sms')}
                className="gap-1.5 rounded-xl font-semibold"
              >
                <Phone className="w-3.5 h-3.5" /> SMS Text
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reminderChannel === 'email' ? 'default' : 'ghost'}
                onClick={() => setReminderChannel('email')}
                className="gap-1.5 rounded-xl font-semibold"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </Button>
            </div>

            {/* Recipient Notice */}
            <div className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-xl">
              <span>Sending to: </span>
              <strong className="text-foreground">
                {reminderChannel === 'sms'
                  ? reminderModalData?.phone || 'No phone set'
                  : reminderModalData?.email || 'No email set'}
              </strong>
            </div>

            {/* Message Box */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted-foreground">
                Customize Message:
              </label>
              <Textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="text-xs bg-muted/40 min-h-20"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReminderModalData(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  isSendingReminder ||
                  (reminderChannel === 'sms' && !reminderModalData?.phone) ||
                  (reminderChannel === 'email' && !reminderModalData?.email)
                }
                onClick={handleSendReminder}
                className="gap-1.5"
              >
                {isSendingReminder ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Dispatch Reminder
                  </>
                )}
              </Button>
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Record Loan Modal */}
      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => {
          setIsLoanModalOpen(false);
          setSelectedContactIdForLoan('');
        }}
        contacts={contacts}
        properties={properties}
        creditCards={creditCards}
        defaultContactId={selectedContactIdForLoan}
      />
    </div>
  );
}
