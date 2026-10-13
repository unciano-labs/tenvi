'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { deleteLoanAction } from '@/app/actions/loans';
import { toast } from 'sonner';
import {
  HandCoins,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  CreditCard as CreditCardIcon,
  Phone,
  Mail,
  Users,
  LayoutGrid,
} from 'lucide-react';
import { LoanModal } from '@/components/Forms/LoanModal';
import { LoanPaymentModal } from '@/components/Forms/LoanPaymentModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import {
  formatMoney,
  formatDate,
  calculateLoanStatus,
} from '@/lib/finance/calculations';
import { Loan, Contact, CreditCard } from '@/types';
import { confirmModal } from '@/components/ui/GlobalDialog';

interface LoansClientProps {
  initialLoans: Loan[];
  contacts: Contact[];
  creditCards?: CreditCard[];
}

export function LoansClient({
  initialLoans,
  contacts,
  creditCards = [],
}: LoansClientProps) {
  const router = useRouter();
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] =
    useState<Loan | null>(null);
  const [selectedContactIdForLoan, setSelectedContactIdForLoan] =
    useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('active');
  const [viewMode, setViewMode] = useState<'entity' | 'flat'>('entity');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const [entityVisibleCount, setEntityVisibleCount] = useState<number>(8);

  const totalOriginal = initialLoans.reduce(
    (sum, l) => sum + Number(l.amount || 0) + Number(l.total_interest || 0),
    0
  );
  const totalOwed = initialLoans.reduce(
    (sum, l) => sum + Number(l.balance_remaining || 0),
    0
  );

  const filteredLoans = initialLoans.filter((l) => {
    if (statusFilter === 'active' && l.status === 'paid') return false;
    if (statusFilter === 'paid' && l.status !== 'paid') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = l.contact?.name?.toLowerCase().includes(q);
      const matchReason = l.reason?.toLowerCase().includes(q);
      const matchCard = l.credit_card?.bank_name.toLowerCase().includes(q);
      const matchAmount = String(l.amount).includes(q);
      if (!matchName && !matchReason && !matchCard && !matchAmount) return false;
    }
    return true;
  });

  // Group filtered loans by Contact/Entity
  const groupedEntities = useMemo(() => {
    const map = new Map<
      string,
      {
        contactId: string;
        name: string;
        phone?: string | null;
        email?: string | null;
        totalOwed: number;
        totalOriginal: number;
        totalPaid: number;
        activeLoansCount: number;
        loans: Loan[];
      }
    >();

    filteredLoans.forEach((loan) => {
      const contactId = loan.contact_id || 'unknown';
      const name = loan.contact?.name || 'Unknown Borrower';
      const phone = loan.contact?.phone;
      const email = loan.contact?.email;

      if (!map.has(contactId)) {
        map.set(contactId, {
          contactId,
          name,
          phone,
          email,
          totalOwed: 0,
          totalOriginal: 0,
          totalPaid: 0,
          activeLoansCount: 0,
          loans: [],
        });
      }

      const group = map.get(contactId)!;
      group.loans.push(loan);

      const orig = Number(loan.amount || 0) + Number(loan.total_interest || 0);
      const balance = Number(loan.balance_remaining || 0);
      const paid = Math.max(0, orig - balance);

      group.totalOriginal += orig;
      group.totalOwed += balance;
      group.totalPaid += paid;
      if (loan.status !== 'paid') {
        group.activeLoansCount += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Prioritize entities with active balance
      if (a.totalOwed > 0 && b.totalOwed <= 0) return -1;
      if (a.totalOwed <= 0 && b.totalOwed > 0) return 1;
      if (b.totalOwed !== a.totalOwed) return b.totalOwed - a.totalOwed;
      return b.loans.length - a.loans.length;
    });
  }, [filteredLoans]);

  const displayedLoans = filteredLoans.slice(0, visibleCount);
  const displayedEntities = groupedEntities.slice(0, entityVisibleCount);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await confirmModal({
      title: 'Delete Loan Record?',
      description: 'Are you sure you want to remove this loan and its repayment history? This action cannot be undone.',
      confirmText: 'Delete Loan',
      variant: 'danger',
    });
    if (!confirmed) return;
    const res = await deleteLoanAction(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Loan deleted.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
            People Who Owe You
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track money lent to friends, family, and business operations with monthly installments or advances.
          </p>
        </div>

        <Button
          onClick={() => {
            setSelectedContactIdForLoan('');
            setIsLoanModalOpen(true);
          }}
          className="rounded-xl gap-2 font-semibold shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record a Loan / Advance
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Total Still Owed to You"
          value={formatMoney(totalOwed)}
          subtext={`Across ${initialLoans.filter((l) => l.status !== 'paid').length} active loans (${groupedEntities.filter((g) => g.totalOwed > 0).length} entities)`}
          icon={HandCoins}
          variant="warning"
        />

        <StatCard
          label="Total Money Lent"
          value={formatMoney(totalOriginal)}
          subtext="All-time recorded loans"
          icon={HandCoins}
          variant="neutral"
        />

        <StatCard
          label="Fully Repaid"
          value={formatMoney(totalOriginal - totalOwed)}
          subtext={`${initialLoans.filter((l) => l.status === 'paid').length} loans cleared`}
          icon={CheckCircle2}
          variant="positive"
        />
      </div>

      {/* Filter Tabs, View Mode Switcher, and Search Bar */}
      <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-3xl shadow-xs overflow-hidden min-w-0">
        {/* View Mode & Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl max-w-full overflow-x-auto no-scrollbar shrink-0">
            <Button
              type="button"
              variant={viewMode === 'entity' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('entity');
                setEntityVisibleCount(8);
              }}
              className={`rounded-xl text-xs font-bold gap-1.5 whitespace-nowrap ${
                viewMode === 'entity' ? 'shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-primary" />
              Group by Entity ({groupedEntities.length})
            </Button>
            <Button
              type="button"
              variant={viewMode === 'flat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('flat');
                setVisibleCount(8);
              }}
              className={`rounded-xl text-xs font-bold gap-1.5 whitespace-nowrap ${
                viewMode === 'flat' ? 'shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Individual Loans ({filteredLoans.length})
            </Button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-2xl max-w-full overflow-x-auto no-scrollbar shrink-0">
            <Button
              type="button"
              variant={statusFilter === 'active' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setStatusFilter('active');
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === 'active' ? 'shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Active ({initialLoans.filter((l) => l.status !== 'paid').length})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'paid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setStatusFilter('paid');
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === 'paid' ? 'shadow-xs' : 'text-muted-foreground'
              }`}
            >
              Paid ({initialLoans.filter((l) => l.status === 'paid').length})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                statusFilter === 'all' ? 'shadow-xs' : 'text-muted-foreground'
              }`}
            >
              All ({initialLoans.length})
            </Button>
          </div>
        </div>

        {/* Search input and counter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search entity, note, bank..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>

          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap hidden sm:inline">
            {viewMode === 'entity'
              ? `${groupedEntities.length} ${groupedEntities.length === 1 ? 'entity' : 'entities'}`
              : `${filteredLoans.length} ${filteredLoans.length === 1 ? 'loan' : 'loans'}`}
          </span>
        </div>
      </Card>

      {/* Content Section */}
      {filteredLoans.length === 0 ? (
        searchQuery ? (
          <Card className="p-10 text-center shadow-xs space-y-2">
            <p className="text-sm font-bold text-foreground">No records matched "{searchQuery}"</p>
            <p className="text-xs text-muted-foreground">Try adjusting your keywords or clearing filters.</p>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold"
            >
              Clear Search & Filters
            </Button>
          </Card>
        ) : (
          <EmptyState
            icon={HandCoins}
            title="No loans found"
            description={
              initialLoans.length === 0
                ? 'Keep peace of mind by logging money you lend to friends, family, or business operations.'
                : 'No loans match your current filter.'
            }
            actionText={initialLoans.length === 0 ? 'Record a Loan' : undefined}
            onAction={() => {
              setSelectedContactIdForLoan('');
              setIsLoanModalOpen(true);
            }}
          />
        )
      ) : viewMode === 'entity' ? (
        /* ==========================================================
           1. GROUP BY ENTITY / PERSON VIEW
           ========================================================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedEntities.map((group) => {
              const percentPaid =
                group.totalOriginal > 0
                  ? Math.round((group.totalPaid / group.totalOriginal) * 100)
                  : 100;
              const isFullySettled = group.totalOwed <= 0;

              return (
                <Card
                  key={group.contactId}
                  className="p-6 sm:p-7 shadow-xs overflow-hidden min-w-0 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4 min-w-0">
                    {/* Entity Card Header */}
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-foreground truncate">
                            {group.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {group.phone && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                {group.phone}
                              </span>
                            )}
                            {group.email && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {group.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={isFullySettled ? 'success' : 'warning'}
                        className="font-bold text-xs shrink-0 whitespace-nowrap"
                      >
                        {isFullySettled ? 'All Settled ✅' : `${formatMoney(group.totalOwed)} Owed`}
                      </Badge>
                    </div>

                    {/* Balance & Repayment Progress Bar */}
                    <div className="p-4 rounded-2xl bg-muted/60 space-y-2.5 min-w-0">
                      <div className="flex justify-between items-end gap-2 min-w-0">
                        <div className="min-w-0">
                          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">
                            Total Outstanding
                          </span>
                          <span className="text-2xl font-extrabold text-foreground truncate block">
                            {formatMoney(group.totalOwed)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground shrink-0">
                          of {formatMoney(group.totalOriginal)} lent
                        </span>
                      </div>

                      <Progress value={percentPaid} className="h-2.5" />

                      <div className="flex justify-between items-center text-xs text-muted-foreground font-medium pt-0.5">
                        <span>{formatMoney(group.totalPaid)} repaid ({percentPaid}%)</span>
                        <Badge variant="soft" className="text-2xs font-semibold">
                          {group.loans.length} {group.loans.length === 1 ? 'Advance / Loan' : 'Advances / Loans'}
                        </Badge>
                      </div>
                    </div>

                    {/* Itemized Advances List under this Entity */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                        <span>Recorded Advances & Schedules</span>
                        <span className="font-normal">
                          {group.activeLoansCount} active
                        </span>
                      </div>

                      <div
                        style={{ maxHeight: '240px', overflowY: 'auto' }}
                        className="pr-1 space-y-2 bili-scrollbar overscroll-contain"
                      >
                        {group.loans.map((loan) => {
                          const math = calculateLoanStatus(loan.amount, loan.balance_remaining);

                          return (
                            <div
                              key={loan.id}
                              onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                              className="group p-3 rounded-2xl bg-card hover:bg-muted/50 transition-colors shadow-2xs cursor-pointer flex flex-col gap-2 min-w-0"
                            >
                              <div className="flex items-start justify-between gap-2 min-w-0">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <Badge
                                      variant={
                                        loan.status === 'paid'
                                          ? 'success'
                                          : loan.is_installment
                                          ? 'default'
                                          : 'warning'
                                      }
                                      className="text-2xs font-bold uppercase tracking-wider shrink-0"
                                    >
                                      {loan.status === 'paid'
                                        ? 'Paid'
                                        : loan.is_installment
                                        ? `${loan.installment_months}M Installment`
                                        : 'Advance'}
                                    </Badge>

                                    {loan.credit_card && (
                                      <Badge variant="soft" className="text-2xs gap-1 shrink-0">
                                        <CreditCardIcon className="w-3 h-3 text-muted-foreground" />
                                        {loan.credit_card.bank_name} •••• {loan.credit_card.last_4}
                                      </Badge>
                                    )}
                                  </div>

                                  <span className="font-bold text-foreground group-hover:text-primary transition-colors text-xs truncate block mt-1">
                                    {loan.reason || 'Personal Advance'}
                                  </span>

                                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span>Lent {formatDate(loan.loaned_on)}</span>
                                    {loan.is_installment && loan.monthly_due_day && (
                                      <span>• Due day {loan.monthly_due_day}</span>
                                    )}
                                    {!loan.is_installment && loan.due_date && (
                                      <span>• Target: {formatDate(loan.due_date)}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span
                                    className={`font-extrabold text-sm block ${
                                      loan.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                                    }`}
                                  >
                                    {formatMoney(loan.balance_remaining)}
                                  </span>
                                  {Number(loan.amount) > Number(loan.balance_remaining) && loan.status !== 'paid' && (
                                    <span className="text-xs text-muted-foreground block">
                                      of {formatMoney(Number(loan.amount))}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar inside line item */}
                              <div className="flex items-center justify-between gap-3 pt-1">
                                <div className="w-28 sm:w-36 shrink-0">
                                  <Progress value={math.percentPaid} className="h-1.5" />
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  {loan.status !== 'paid' && (
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLoanForPayment(loan);
                                      }}
                                      className="font-semibold"
                                    >
                                      + Settle
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    onClick={(e) => handleDelete(e, loan.id)}
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Delete loan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>

                                  <span className="text-primary p-0.5 group-hover:translate-x-0.5 transition-transform">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Entity Card Footer Actions */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="soft"
                      size="sm"
                      onClick={() => {
                        setSelectedContactIdForLoan(group.contactId !== 'unknown' ? group.contactId : '');
                        setIsLoanModalOpen(true);
                      }}
                      className="text-xs font-semibold gap-1.5 rounded-xl"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Advance
                    </Button>

                    {group.totalOwed > 0 && group.loans.find((l) => l.status !== 'paid') ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const firstUnpaid = group.loans.find((l) => l.status !== 'paid');
                          if (firstUnpaid) setSelectedLoanForPayment(firstUnpaid);
                        }}
                        className="text-xs font-semibold gap-1 rounded-xl shadow-xs"
                      >
                        + Record Repayment
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> All Clear
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Lazy Load Button for Entities */}
          {groupedEntities.length > entityVisibleCount && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEntityVisibleCount((prev) => prev + 8)}
                className="px-6 py-2.5 text-xs font-semibold rounded-xl"
              >
                Load More Entities ({groupedEntities.length - entityVisibleCount} remaining)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Showing {Math.min(entityVisibleCount, groupedEntities.length)} of {groupedEntities.length} entities
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ==========================================================
           2. INDIVIDUAL FLAT LOANS VIEW
           ========================================================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayedLoans.map((loan) => {
              const math = calculateLoanStatus(loan.amount, loan.balance_remaining);

              return (
                <Card
                  key={loan.id}
                  onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                  className="p-6 sm:p-7 shadow-xs overflow-hidden min-w-0 transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {loan.contact?.name || 'Borrower'}
                          </h3>
                          {loan.is_installment && (
                            <Badge variant="soft" className="gap-1 font-semibold text-xs shrink-0">
                              <Clock className="w-3 h-3" />
                              {loan.installment_months} Mos Installment
                            </Badge>
                          )}
                          {loan.credit_card && (
                            <Badge variant="soft" className="gap-1 font-semibold text-xs shrink-0">
                              <CreditCardIcon className="w-3 h-3 text-muted-foreground" />
                              {loan.credit_card.bank_name} •••• {loan.credit_card.last_4}
                            </Badge>
                          )}
                          {loan.downpayment_amount && loan.downpayment_amount > 0 ? (
                            <Badge variant="success" className="gap-1 font-semibold text-xs shrink-0">
                              ₱{Number(loan.downpayment_amount).toLocaleString()} Downpayment
                            </Badge>
                          ) : null}
                        </div>
                        {loan.reason && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {loan.reason}
                          </p>
                        )}
                      </div>

                      <Badge
                        variant={
                          loan.status === 'paid'
                            ? 'success'
                            : loan.status === 'partial'
                            ? 'default'
                            : 'warning'
                        }
                        className="font-bold text-xs shrink-0 whitespace-nowrap"
                      >
                        {loan.status === 'paid'
                          ? 'All Paid Up ✅'
                          : loan.status === 'partial'
                          ? 'Partially Paid'
                          : 'Unpaid'}
                      </Badge>
                    </div>

                    {/* Balance Display */}
                    <div className="mt-4 p-4 rounded-2xl bg-muted/60 min-w-0">
                      <div className="flex justify-between items-end mb-2 gap-2 min-w-0">
                        <div className="min-w-0">
                          <span className="text-xs text-muted-foreground font-medium block">
                            Remaining Balance
                          </span>
                          <span className="text-2xl font-extrabold text-foreground truncate block">
                            {formatMoney(loan.balance_remaining)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground shrink-0">
                          of {formatMoney(loan.amount)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <Progress value={math.percentPaid} className="h-2.5" />
                      <div className="flex justify-between text-xs text-muted-foreground font-medium mt-1.5">
                        <span>{formatMoney(math.paidAmount)} repaid</span>
                        <span>{math.percentPaid}% complete</span>
                      </div>
                    </div>

                    {/* Installment / Due Date info banner */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground min-w-0">
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        <span className="shrink-0">Lent: {formatDate(loan.loaned_on)}</span>
                        {loan.is_installment && loan.monthly_due_day && (
                          <Badge variant="soft" className="shrink-0">
                            Due day {loan.monthly_due_day} of month
                          </Badge>
                        )}
                        {!loan.is_installment && loan.due_date && (
                          <span className="font-semibold text-foreground shrink-0">
                            Target return: {formatDate(loan.due_date)}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform shrink-0">
                        {loan.is_installment ? 'View Schedule' : 'View Details'} <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {loan.status !== 'paid' ? (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoanForPayment(loan);
                        }}
                        className="rounded-xl text-xs font-semibold shadow-xs"
                      >
                        + Record Repayment
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Settled
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => handleDelete(e, loan.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete loan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Lazy Load Button */}
          {filteredLoans.length > visibleCount && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="px-6 py-2.5 text-xs font-semibold rounded-xl"
              >
                Load More Loans ({filteredLoans.length - visibleCount} remaining)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Showing {Math.min(visibleCount, filteredLoans.length)} of {filteredLoans.length} loans
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => {
          setIsLoanModalOpen(false);
          setSelectedContactIdForLoan('');
        }}
        contacts={contacts}
        creditCards={creditCards}
        defaultContactId={selectedContactIdForLoan}
      />

      <LoanPaymentModal
        isOpen={!!selectedLoanForPayment}
        onClose={() => setSelectedLoanForPayment(null)}
        loan={selectedLoanForPayment}
      />
    </div>
  );
}
