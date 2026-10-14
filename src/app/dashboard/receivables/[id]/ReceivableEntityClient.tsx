'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  HandCoins,
  Receipt,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Send,
  Plus,
  ArrowRight,
  TrendingUp,
  Percent,
  Phone,
  Mail,
  CreditCard as CreditCardIcon,
  Loader2,
  X,
  ExternalLink,
  Trash2,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { Loan, Contact, CreditCard, Property } from '@/types';
import { formatMoney, formatDate } from '@/lib/finance/calculations';
import { getPropertyIcon } from '@/lib/constants';
import {
  bulkTransferReceivableItemsAction,
  bulkDeleteReceivableItemsAction,
  bulkSettleReceivableItemsAction,
  ReceivableItemKey,
} from '@/app/actions/receivables';
import { sendLoanBorrowerReminderAction } from '@/app/actions/loans';
import { sendSplitParticipantReminderAction } from '@/app/actions/splits';
import { LoanModal } from '@/components/Forms/LoanModal';
import { Button } from '@/components/ui/button';
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

interface SplitParticipantWithSplit {
  id: string;
  website_id: string;
  user_id: string;
  split_id: string;
  contact_id: string;
  share_amount: number;
  is_paid: boolean;
  paid_on?: string | null;
  payment_note?: string | null;
  contact?: Contact | null;
  split: {
    id: string;
    title: string;
    total_amount: number;
    occurred_on: string;
    note?: string | null;
    credit_card?: CreditCard | null;
  };
}

interface ReceivableEntityClientProps {
  entityId: string;
  entityName: string;
  entityPhone?: string | null;
  entityEmail?: string | null;
  isProperty?: boolean;
  matchedProperty?: Property | null;
  initialLoans: Loan[];
  initialSplitParticipants: SplitParticipantWithSplit[];
  contacts: Contact[];
  properties: Property[];
  creditCards: CreditCard[];
}

export interface EntityItem {
  key: string;
  id: string;
  kind: 'loan' | 'split';
  splitId?: string;
  title: string;
  amount: number;
  balanceRemaining: number;
  isPaid: boolean;
  isOverdue: boolean;
  occurredOn: string;
  dueDate?: string | null;
  dueText: string;
  creditCard?: CreditCard | null;
  rawLoan?: Loan;
  rawSplitParticipant?: SplitParticipantWithSplit;
}

type FilterStatus = 'all' | 'outstanding' | 'settled' | 'loans' | 'splits';

export function ReceivableEntityClient({
  entityId,
  entityName,
  entityPhone,
  entityEmail,
  isProperty = false,
  matchedProperty,
  initialLoans,
  initialSplitParticipants,
  contacts,
  properties,
  creditCards,
}: ReceivableEntityClientProps) {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [splitParticipants, setSplitParticipants] = useState<SplitParticipantWithSplit[]>(
    initialSplitParticipants
  );

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Dialog states for Bulk Actions
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Transfer Form State
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferCustomName, setTransferCustomName] = useState('');

  // Settle Form State
  const [settleMethod, setSettleMethod] = useState('cash');
  const [settleDate, setSettleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [settleNote, setSettleNote] = useState('');

  // Reminder Dialog State
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<{
    amount: number;
    title: string;
    loanId?: string;
    participantId?: string;
  } | null>(null);
  const [reminderChannel, setReminderChannel] = useState<'both' | 'sms' | 'email'>('both');
  const [reminderCustomMessage, setReminderCustomMessage] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);

  // Transform raw items into unified list
  const unifiedItems: EntityItem[] = useMemo(() => {
    const list: EntityItem[] = [];

    // 1. Process Loans
    loans.forEach((l) => {
      const isPaid = l.status === 'paid';
      const balance = Number(l.balance_remaining || 0);
      let targetDue = l.due_date;

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
        key: `loan-${l.id}`,
        id: l.id,
        kind: 'loan',
        title: l.reason || 'Cash Advance',
        amount: Number(l.amount || 0) + Number(l.total_interest || 0),
        balanceRemaining: balance,
        isPaid,
        isOverdue,
        occurredOn: l.loaned_on,
        dueDate: targetDue,
        dueText,
        creditCard: l.credit_card,
        rawLoan: l,
      });
    });

    // 2. Process Split Participants
    splitParticipants.forEach((p) => {
      const s = p.split;
      const isPaid = p.is_paid;
      const occDate = new Date(s.occurred_on);
      occDate.setHours(0, 0, 0, 0);
      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((todayObj.getTime() - occDate.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = !isPaid && diffDays > 14;

      let dueText = isPaid ? 'Settled' : isOverdue ? `${diffDays}d ago` : 'Split Share';

      list.push({
        key: `split-${p.id}`,
        id: p.id,
        kind: 'split',
        splitId: s.id,
        title: s.title || 'Bill Split Share',
        amount: Number(p.share_amount || 0),
        balanceRemaining: isPaid ? 0 : Number(p.share_amount || 0),
        isPaid,
        isOverdue,
        occurredOn: s.occurred_on,
        dueDate: s.occurred_on,
        dueText,
        creditCard: s.credit_card,
        rawSplitParticipant: p,
      });
    });

    return list.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime();
    });
  }, [loans, splitParticipants]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalOriginated = 0;
    let totalOwed = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let activeCount = 0;
    let settledCount = 0;

    unifiedItems.forEach((it) => {
      totalOriginated += it.amount;
      totalOwed += it.balanceRemaining;
      totalPaid += it.amount - it.balanceRemaining;

      if (it.isPaid) {
        settledCount++;
      } else {
        activeCount++;
        if (it.isOverdue) {
          overdueCount++;
          overdueAmount += it.balanceRemaining;
        }
      }
    });

    const percentPaid =
      totalOriginated > 0 ? Math.round((totalPaid / totalOriginated) * 100) : 100;

    return {
      totalOriginated,
      totalOwed,
      totalPaid,
      percentPaid,
      overdueCount,
      overdueAmount,
      activeCount,
      settledCount,
      totalCount: unifiedItems.length,
    };
  }, [unifiedItems]);

  // Filtered items based on status tab and search
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Tab filter
      if (filterStatus === 'outstanding' && item.isPaid) return false;
      if (filterStatus === 'settled' && !item.isPaid) return false;
      if (filterStatus === 'loans' && item.kind !== 'loan') return false;
      if (filterStatus === 'splits' && item.kind !== 'split') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const amountMatch = String(item.amount).includes(q);
        const dateMatch = item.occurredOn.includes(q);
        if (!titleMatch && !amountMatch && !dateMatch) return false;
      }

      return true;
    });
  }, [unifiedItems, filterStatus, searchQuery]);

  // Selection helpers
  const isAllSelected =
    filteredItems.length > 0 && filteredItems.every((it) => selectedKeys.has(it.key));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      const next = new Set(selectedKeys);
      filteredItems.forEach((it) => next.add(it.key));
      setSelectedKeys(next);
    }
  };

  const handleToggleItemSelect = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  const handleToggleExpand = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedKeys(next);
  };

  const selectedItems = useMemo(() => {
    return unifiedItems.filter((it) => selectedKeys.has(it.key));
  }, [unifiedItems, selectedKeys]);

  const selectedTotalBalance = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + it.balanceRemaining, 0);
  }, [selectedItems]);

  const selectedTotalAmount = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + it.amount, 0);
  }, [selectedItems]);

  // Transform selected items to ReceivableItemKey for server actions
  const getSelectedKeysPayload = (): ReceivableItemKey[] => {
    return selectedItems.map((it) => ({
      id: it.id,
      kind: it.kind,
      splitId: it.splitId,
    }));
  };

  // ==========================================
  // BULK ACTION HANDLERS
  // ==========================================

  const handleConfirmTransfer = () => {
    const payload = getSelectedKeysPayload();
    if (payload.length === 0) return;

    startTransition(async () => {
      const res = await bulkTransferReceivableItemsAction({
        items: payload,
        targetContactId: transferTargetId || undefined,
        newContactName: transferCustomName || undefined,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Transferred ${res.count} items to ${res.targetName}`);
        setIsTransferDialogOpen(false);
        setSelectedKeys(new Set());
        setTransferTargetId('');
        setTransferCustomName('');
        router.refresh();
      }
    });
  };

  const handleConfirmSettle = () => {
    const payload = getSelectedKeysPayload();
    if (payload.length === 0) return;

    startTransition(async () => {
      const res = await bulkSettleReceivableItemsAction({
        items: payload,
        paymentMethod: settleMethod,
        paidOn: settleDate,
        note: settleNote,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Marked ${res.count} items as settled & paid!`);
        setIsSettleDialogOpen(false);
        setSelectedKeys(new Set());
        setSettleNote('');
        router.refresh();
      }
    });
  };

  const handleConfirmDelete = () => {
    const payload = getSelectedKeysPayload();
    if (payload.length === 0) return;

    startTransition(async () => {
      const res = await bulkDeleteReceivableItemsAction({
        items: payload,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Deleted ${res.count} items.`);
        setIsDeleteDialogOpen(false);
        setSelectedKeys(new Set());
        router.refresh();
      }
    });
  };

  // Quick single-item action wrappers
  const handleQuickSettleItem = (item: EntityItem) => {
    setSelectedKeys(new Set([item.key]));
    setIsSettleDialogOpen(true);
  };

  const handleQuickTransferItem = (item: EntityItem) => {
    setSelectedKeys(new Set([item.key]));
    setIsTransferDialogOpen(true);
  };

  const handleQuickDeleteItem = (item: EntityItem) => {
    setSelectedKeys(new Set([item.key]));
    setIsDeleteDialogOpen(true);
  };

  // Reminder dispatch handler
  const handleSendReminder = async () => {
    if (!reminderTarget) return;
    setReminderLoading(true);

    try {
      const channels: Array<'sms' | 'email'> =
        reminderChannel === 'both'
          ? [
              ...(entityPhone ? (['sms'] as const) : []),
              ...(entityEmail ? (['email'] as const) : []),
            ]
          : [reminderChannel];

      if (channels.length === 0) {
        channels.push(entityPhone ? 'sms' : 'email');
      }

      if (reminderTarget.loanId) {
        for (const ch of channels) {
          const res = await sendLoanBorrowerReminderAction(
            reminderTarget.loanId,
            ch,
            reminderCustomMessage || undefined
          );
          if (res.error) {
            toast.error(res.error);
            return;
          }
        }
        toast.success(`Reminder sent to ${entityName}`);
        setIsReminderOpen(false);
      } else if (reminderTarget.participantId) {
        const splitItem = splitParticipants.find((p) => p.id === reminderTarget.participantId);
        if (splitItem) {
          for (const ch of channels) {
            const res = await sendSplitParticipantReminderAction({
              participantId: reminderTarget.participantId,
              channel: ch,
              customMessage: reminderCustomMessage || undefined,
            });
            if (res.error) {
              toast.error(res.error);
              return;
            }
          }
          toast.success(`Reminder dispatched to ${entityName}`);
          setIsReminderOpen(false);
        }
      }
    } catch {
      toast.error('Failed to dispatch reminder');
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/receivables"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Receivables</span>
          </Link>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-extrabold text-lg shrink-0">
              {isProperty && matchedProperty ? (
                <span className="text-xl">{getPropertyIcon(matchedProperty.property_type)}</span>
              ) : (
                entityName.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {entityName}
                </h1>
                {isProperty && matchedProperty && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    {getPropertyIcon(matchedProperty.property_type)} Asset / Property Entity
                  </Badge>
                )}
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    stats.totalOwed <= 0
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-indigo-500/10 text-indigo-500'
                  }`}
                >
                  {stats.totalOwed <= 0 ? 'Fully Settled' : `${formatMoney(stats.totalOwed)} Owed`}
                </span>
              </div>

              {/* Contact meta */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                {entityPhone && (
                  <a
                    href={`tel:${entityPhone}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span>{entityPhone}</span>
                  </a>
                )}
                {entityEmail && (
                  <a
                    href={`mailto:${entityEmail}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <span>{entityEmail}</span>
                  </a>
                )}
                {matchedProperty?.identifier && (
                  <span className="bg-muted px-2 py-0.5 rounded-md font-mono text-xs">
                    ID: {matchedProperty.identifier}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
          {stats.totalOwed > 0 && (entityPhone || entityEmail) && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setReminderTarget({
                  amount: stats.totalOwed,
                  title: 'outstanding balance',
                  loanId: loans[0]?.id,
                  participantId: splitParticipants.find((p) => !p.is_paid)?.id,
                });
                setIsReminderOpen(true);
              }}
              className="gap-1.5 font-semibold"
            >
              <Send className="w-3.5 h-3.5 text-blue-500" />
              <span>Send Reminder</span>
            </Button>
          )}

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsLoanModalOpen(true)}
            className="gap-1.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Advance</span>
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Owed */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Outstanding Balance
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <HandCoins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatMoney(stats.totalOwed)}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.activeCount} active item{stats.activeCount === 1 ? '' : 's'}
          </div>
        </div>

        {/* Total Originated */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Originated
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatMoney(stats.totalOriginated)}
          </div>
          <div className="text-xs text-muted-foreground">Across {stats.totalCount} records</div>
        </div>

        {/* Total Repaid / Settled */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Repaid
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatMoney(stats.totalPaid)}
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.percentPaid}%` }}
            />
          </div>
        </div>

        {/* Repayment Health */}
        <div className="bg-card text-card-foreground rounded-3xl p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Repayment Progress
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {stats.percentPaid}%
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.settledCount} settled item{stats.settledCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* 3. Controls: Filters & Search */}
      <div className="bg-card text-card-foreground rounded-3xl p-4 sm:p-5 shadow-card space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-2xl overflow-x-auto no-scrollbar max-w-full shrink-0">
            {[
              { key: 'all', label: `All Records (${unifiedItems.length})` },
              { key: 'outstanding', label: `Outstanding (${stats.activeCount})` },
              { key: 'settled', label: `Settled (${stats.settledCount})` },
              { key: 'loans', label: `Advances & Loans (${loans.length})` },
              { key: 'splits', label: `Bill Splits (${splitParticipants.length})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key as FilterStatus)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterStatus === f.key
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search items or amounts..."
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

        {/* Master Selection Toolbar */}
        <div className="pt-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-foreground select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded-md accent-primary cursor-pointer"
              />
              <span>
                Select All ({filteredItems.length} item{filteredItems.length === 1 ? '' : 's'})
              </span>
            </label>
          </div>

          {selectedKeys.size > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground font-medium">
              <span>{selectedKeys.size} selected</span>
              <button
                onClick={() => setSelectedKeys(new Set())}
                className="text-primary hover:underline font-bold cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Unified Records & Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-card text-card-foreground rounded-3xl p-12 text-center space-y-3 shadow-card">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <HandCoins className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No records found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? 'No items match your search. Try clearing the search query.'
                : 'No records exist under this filter.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedKeys.has(item.key);
            const isExpanded = expandedKeys.has(item.key);
            const rawLoan = item.rawLoan;
            const hasInstallments =
              rawLoan?.is_installment &&
              Array.isArray(rawLoan.installments) &&
              rawLoan.installments.length > 0;
            const hasPayments =
              rawLoan && Array.isArray(rawLoan.payments) && rawLoan.payments.length > 0;

            return (
              <div
                key={item.key}
                className={`bg-card text-card-foreground rounded-3xl p-4 sm:p-5 shadow-card transition-all space-y-3 ${
                  isSelected ? 'ring-2 ring-primary/40' : ''
                }`}
              >
                {/* Main Row */}
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  {/* Left: Checkbox + Icon + Title */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItemSelect(item.key)}
                      className="w-4 h-4 rounded-md accent-primary mt-1 cursor-pointer shrink-0"
                    />

                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
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
                        <span className="font-extrabold text-sm sm:text-base text-foreground">
                          {item.title}
                        </span>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            item.kind === 'loan'
                              ? 'bg-indigo-500/10 text-indigo-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {item.kind === 'loan' ? 'Advance' : 'Split Share'}
                        </span>
                        <span
                          className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                            item.isPaid
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : item.isOverdue
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {item.isPaid ? 'Settled' : item.isOverdue ? 'Overdue' : 'Active'}
                        </span>
                      </div>

                      {/* Meta dates and cards */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>Lent {formatDate(item.occurredOn)}</span>
                        </span>

                        {item.dueDate && (
                          <span
                            className={
                              item.isOverdue && !item.isPaid
                                ? 'text-rose-500 font-bold'
                                : 'text-muted-foreground'
                            }
                          >
                            • {item.dueText}
                          </span>
                        )}

                        {item.creditCard && (
                          <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md font-medium text-foreground">
                            <CreditCardIcon className="w-3 h-3 text-muted-foreground" />
                            <span>
                              {item.creditCard.bank_name || item.creditCard.name} ••{' '}
                              {item.creditCard.last_4}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amounts & Quick Actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                    <span
                      className={`font-black text-base sm:text-lg ${
                        item.isPaid ? 'text-emerald-500' : 'text-foreground'
                      }`}
                    >
                      {item.isPaid ? formatMoney(item.amount) : formatMoney(item.balanceRemaining)}
                    </span>

                    {!item.isPaid && item.amount > item.balanceRemaining && (
                      <span className="text-xs text-muted-foreground font-medium">
                        of {formatMoney(item.amount)}
                      </span>
                    )}

                    {/* Quick Action row */}
                    <div className="flex items-center gap-1 pt-1">
                      {!item.isPaid && (
                        <button
                          type="button"
                          onClick={() => handleQuickSettleItem(item)}
                          className="p-1.5 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="Settle this item"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleQuickTransferItem(item)}
                        className="p-1.5 rounded-xl text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                        title="Transfer borrower"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickDeleteItem(item)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {item.kind === 'loan' && (
                        <Link
                          href={`/dashboard/loans/${item.id}`}
                          className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="View loan details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}

                      {(hasInstallments || hasPayments) && (
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(item.key)}
                          className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title={isExpanded ? 'Collapse breakdown' : 'Expand breakdown'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Breakdown for Installments and Payments */}
                {isExpanded && rawLoan && (
                  <div className="pt-3 space-y-3 bg-muted/40 rounded-2xl p-4">
                    {/* Installments schedule */}
                    {hasInstallments && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                          Installment Schedule ({rawLoan.installments?.length} installments):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {rawLoan.installments?.map((inst) => (
                            <div
                              key={inst.id}
                              className="bg-card text-card-foreground rounded-xl p-2.5 shadow-xs flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-foreground">
                                  #{inst.installment_number} Due {formatDate(inst.due_date)}
                                </span>
                                <span className="block text-muted-foreground">
                                  {formatMoney(inst.amount)}
                                </span>
                              </div>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                                  inst.is_paid
                                    ? 'bg-emerald-500/10 text-emerald-500'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {inst.is_paid ? 'Paid' : 'Unpaid'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payments history */}
                    {hasPayments && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                          Payment History ({rawLoan.payments?.length} payments):
                        </span>
                        <div className="space-y-1.5">
                          {rawLoan.payments?.map((pm) => (
                            <div
                              key={pm.id}
                              className="bg-card text-card-foreground rounded-xl p-2.5 shadow-xs flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <div>
                                  <span className="font-bold text-foreground">
                                    {formatMoney(pm.amount)} via {pm.payment_method}
                                  </span>
                                  {pm.note && (
                                    <span className="text-muted-foreground block text-xs">
                                      {pm.note}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-muted-foreground font-medium">
                                {formatDate(pm.paid_on)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Sticky Bottom Bulk Action Bar (When items are selected) */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-20 sm:bottom-6 inset-x-4 max-w-3xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-card/95 text-card-foreground backdrop-blur-md rounded-3xl p-4 sm:px-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs">
                {selectedKeys.size}
              </div>
              <div>
                <span className="font-extrabold text-sm text-foreground block">
                  {selectedKeys.size} item{selectedKeys.size === 1 ? '' : 's'} selected
                </span>
                <span className="text-xs text-muted-foreground">
                  Total Balance: {formatMoney(selectedTotalBalance)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
              {/* Transfer Borrower */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsTransferDialogOpen(true)}
                className="gap-1.5 text-xs font-bold"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                <span>Transfer Borrower</span>
              </Button>

              {/* Settle / Mark as Paid */}
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setIsSettleDialogOpen(true)}
                className="gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark as Paid</span>
              </Button>

              {/* Delete */}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="gap-1.5 text-xs font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>

              {/* Clear */}
              <button
                type="button"
                onClick={() => setSelectedKeys(new Set())}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Deselect all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 1: TRANSFER BORROWER DIALOG
          ========================================== */}
      <ResponsiveDialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
              Transfer Borrower ({selectedKeys.size} item{selectedKeys.size === 1 ? '' : 's'})
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Re-assign the selected loans or bill splits to another contact or registered
              property/asset.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Select Destination Entity
              </label>
              <select
                value={transferTargetId}
                onChange={(e) => {
                  setTransferTargetId(e.target.value);
                  if (e.target.value !== 'custom') {
                    setTransferCustomName('');
                  }
                }}
                className="w-full h-11 px-3 text-sm bg-muted rounded-xl text-foreground font-medium cursor-pointer"
              >
                <option value="">-- Choose Contact or Asset --</option>
                <optgroup label="People & Contacts">
                  {contacts
                    .filter((c) => c.id !== entityId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        👤 {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Properties & Assets">
                  {properties.map((p) => (
                    <option key={p.id} value={`prop:${p.name}`}>
                      {getPropertyIcon(p.property_type)} {p.name}{' '}
                      {p.identifier ? `[${p.identifier}]` : ''}
                    </option>
                  ))}
                </optgroup>
                <option value="custom">➕ Create New Contact Name...</option>
              </select>
            </div>

            {transferTargetId === 'custom' && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  New Borrower Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Maria Clara"
                  value={transferCustomName}
                  onChange={(e) => setTransferCustomName(e.target.value)}
                  className="bg-muted rounded-xl text-sm"
                />
              </div>
            )}

            <div className="bg-muted/50 rounded-2xl p-3 text-xs text-muted-foreground space-y-1">
              <span className="font-bold text-foreground block">Items being transferred:</span>
              <ul className="list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto bili-scrollbar">
                {selectedItems.map((it) => (
                  <li key={it.key} className="truncate">
                    {it.title} ({formatMoney(it.amount)})
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTransferDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleConfirmTransfer}
                disabled={
                  isPending || (!transferTargetId && !transferCustomName) ||
                  (transferTargetId === 'custom' && !transferCustomName.trim())
                }
                className="gap-1.5 font-bold"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Confirm Transfer
              </Button>
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ==========================================
          MODAL 2: SETTLE / MARK AS PAID DIALOG
          ========================================== */}
      <ResponsiveDialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Settle {selectedKeys.size} Item{selectedKeys.size === 1 ? '' : 's'}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Mark the selected receivables as fully paid. Repayment logs and income transactions
              will be recorded automatically.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="space-y-4 pt-2">
            <div className="bg-emerald-500/10 text-emerald-500 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  Total Outstanding to Settle
                </span>
                <span className="text-xl font-black">{formatMoney(selectedTotalBalance)}</span>
              </div>
              <CheckCircle2 className="w-8 h-8 opacity-80" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Payment Method
                </label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-muted rounded-xl text-foreground font-medium cursor-pointer"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="gcash">📱 GCash</option>
                  <option value="maya">📱 Maya</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Settlement Date
                </label>
                <Input
                  type="date"
                  value={settleDate}
                  onChange={(e) => setSettleDate(e.target.value)}
                  className="bg-muted rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Note / Remarks (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Paid via GCash reference 123456"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                className="bg-muted rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSettleDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleConfirmSettle}
                disabled={isPending}
                className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm Settlement
              </Button>
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ==========================================
          MODAL 3: DELETE CONFIRMATION DIALOG
          ========================================== */}
      <ResponsiveDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2 text-rose-500">
              <Trash2 className="w-5 h-5" />
              Delete {selectedKeys.size} Item{selectedKeys.size === 1 ? '' : 's'}?
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Are you sure you want to permanently delete the selected records? Linked installments
              and payment logs will also be removed. This action cannot be undone.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="space-y-4 pt-2">
            <div className="bg-rose-500/10 text-rose-500 rounded-2xl p-3 text-xs space-y-1">
              <span className="font-bold block">Selected for deletion:</span>
              <ul className="list-disc list-inside space-y-0.5 max-h-28 overflow-y-auto bili-scrollbar">
                {selectedItems.map((it) => (
                  <li key={it.key} className="truncate">
                    {it.title} ({formatMoney(it.amount)})
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="gap-1.5 font-bold"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Permanently
              </Button>
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ==========================================
          MODAL 4: REMINDER DISPATCH DIALOG
          ========================================== */}
      <ResponsiveDialog open={isReminderOpen} onOpenChange={setIsReminderOpen}>
        <ResponsiveDialogContent className="max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Send Reminder to {entityName}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Dispatches an automated friendly notification reminder with outstanding balance
              details.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="space-y-4 pt-2">
            <div className="bg-muted rounded-2xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-bold text-foreground">{entityName}</span>
              </div>
              {entityPhone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium text-foreground">{entityPhone}</span>
                </div>
              )}
              {entityEmail && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium text-foreground">{entityEmail}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-bold">
                <span className="text-foreground">Total Owed:</span>
                <span className="text-indigo-500">{formatMoney(stats.totalOwed)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Notification Channel
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { key: 'both', label: 'SMS & Email' },
                  { key: 'sms', label: 'SMS Only' },
                  { key: 'email', label: 'Email Only' },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setReminderChannel(c.key as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      reminderChannel === c.key
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Custom Message (Optional)
              </label>
              <Textarea
                placeholder="Add a friendly note..."
                value={reminderCustomMessage}
                onChange={(e) => setReminderCustomMessage(e.target.value)}
                className="bg-muted rounded-xl text-xs min-h-[70px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsReminderOpen(false)}
                disabled={reminderLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleSendReminder}
                disabled={reminderLoading}
                className="gap-1.5 font-bold"
              >
                {reminderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Now
              </Button>
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* ==========================================
          MODAL 5: ADD ADVANCE / LOAN MODAL
          ========================================== */}
      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => {
          setIsLoanModalOpen(false);
          router.refresh();
        }}
        contacts={contacts}
        creditCards={creditCards}
        properties={properties}
        defaultContactId={entityId}
      />
    </div>
  );
}
