'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { deleteLoanAction } from '@/app/actions/loans';
import { toast } from 'sonner';
import {
  HandCoins,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  CreditCard as CreditCardIcon,
  Search,
  Users,
  LayoutGrid,
  ExternalLink,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import { LoanModal } from '@/components/Forms/LoanModal';
import { LoanPaymentModal } from '@/components/Forms/LoanPaymentModal';
import { EmptyState } from '@/components/UI/EmptyState';
import { StatCard } from '@/components/UI/StatCard';
import { formatMoney, formatDate, calculateLoanStatus } from '@/lib/finance/calculations';
import { Contact, CreditCard, Loan } from '@/types';
import { confirmModal } from '@/components/UI/GlobalDialog';

interface LoansClientProps {
  initialLoans: Loan[];
  contacts: Contact[];
  creditCards?: CreditCard[];
}

interface EntityLoanGroup {
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

export function LoansClient({ initialLoans, contacts, creditCards = [] }: LoansClientProps) {
  const router = useRouter();
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [selectedContactIdForLoan, setSelectedContactIdForLoan] = useState<string>('');
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  const [viewMode, setViewMode] = useState<'entity' | 'flat'>('entity');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(8);
  const [entityVisibleCount, setEntityVisibleCount] = useState<number>(8);

  const totalOwed = initialLoans.reduce(
    (sum, l) => sum + Number(l.balance_remaining),
    0
  );

  const totalOriginal = initialLoans.reduce(
    (sum, l) => sum + Number(l.amount),
    0
  );

  const filteredLoans = initialLoans.filter((l) => {
    if (statusFilter === 'active' && l.status === 'paid') return false;
    if (statusFilter === 'paid' && l.status !== 'paid') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = l.contact?.name?.toLowerCase().includes(q);
      const matchReason = l.reason?.toLowerCase().includes(q);
      const matchPhone = l.contact?.phone?.toLowerCase().includes(q);
      const matchBank = l.credit_card?.bank_name?.toLowerCase().includes(q);
      if (!matchName && !matchReason && !matchPhone && !matchBank) return false;
    }
    return true;
  });

  // Group filtered loans by debtor / entity
  const groupedEntities = useMemo(() => {
    const map = new Map<string, EntityLoanGroup>();

    filteredLoans.forEach((loan) => {
      const contactId = loan.contact_id || loan.contact?.id || 'unknown';
      const name = loan.contact?.name || 'Borrower / Entity';
      const phone = loan.borrower_phone || loan.contact?.phone;
      const email = loan.borrower_email || loan.contact?.email;

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
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            People Who Owe You
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track money lent to friends, family, and business operations with monthly installments or flexible advances.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedContactIdForLoan('');
            setIsLoanModalOpen(true);
          }}
          className="bili-btn-primary py-3 px-5 text-sm font-semibold shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Record a Loan / Advance
        </button>
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl shadow-sm">
        {/* View Mode & Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl max-w-full overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode('entity');
                setEntityVisibleCount(8);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'entity'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Group by Entity ({groupedEntities.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('flat');
                setVisibleCount(8);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'flat'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Individual Loans ({filteredLoans.length})
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl max-w-full overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => {
                setStatusFilter('active');
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Active ({initialLoans.filter((l) => l.status !== 'paid').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('paid');
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'paid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Paid ({initialLoans.filter((l) => l.status === 'paid').length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('all');
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({initialLoans.length})
            </button>
          </div>
        </div>

        {/* Search input and counter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search entity, note, bank..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(8);
                setEntityVisibleCount(8);
              }}
              className="bili-input w-full pl-9 py-2 text-xs"
            />
          </div>

          <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
            {viewMode === 'entity'
              ? `${groupedEntities.length} ${groupedEntities.length === 1 ? 'entity' : 'entities'}`
              : `${filteredLoans.length} ${filteredLoans.length === 1 ? 'loan' : 'loans'}`}
          </span>
        </div>
      </div>

      {/* Content Section */}
      {filteredLoans.length === 0 ? (
        searchQuery ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm space-y-2">
            <p className="text-sm font-bold text-slate-700">No records matched "{searchQuery}"</p>
            <p className="text-xs text-slate-400">Try adjusting your keywords or clearing filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold text-blue-600 hover:underline pt-1 cursor-pointer"
            >
              Clear Search & Filters
            </button>
          </div>
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
                <div
                  key={group.contactId}
                  className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm overflow-hidden min-w-0 hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    {/* Entity Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-base shrink-0 shadow-2xs">
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-slate-900 truncate">
                            {group.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                            {group.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {group.phone}
                              </span>
                            )}
                            {group.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {group.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0 ${
                          isFullySettled
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        {isFullySettled ? 'All Settled ✅' : `${formatMoney(group.totalOwed)} Owed`}
                      </span>
                    </div>

                    {/* Balance & Repayment Progress Bar */}
                    <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-2.5">
                      <div className="flex justify-between items-end">
                        <div>
                          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                            Total Outstanding
                          </span>
                          <span className="text-2xl font-extrabold text-slate-900">
                            {formatMoney(group.totalOwed)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          of {formatMoney(group.totalOriginal)} lent
                        </span>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500 font-medium pt-0.5">
                        <span>{formatMoney(group.totalPaid)} repaid ({percentPaid}%)</span>
                        <span className="bg-white px-2 py-0.5 rounded-md font-semibold text-slate-700 shadow-2xs">
                          {group.loans.length} {group.loans.length === 1 ? 'Advance / Loan' : 'Advances / Loans'}
                        </span>
                      </div>
                    </div>

                    {/* Itemized Advances List under this Entity */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                        <span>Recorded Advances & Schedules</span>
                        <span className="text-slate-400 font-normal">
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
                              className="group p-3 rounded-2xl bg-white hover:bg-slate-50 transition-colors border border-slate-100 shadow-2xs cursor-pointer flex flex-col gap-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                        loan.status === 'paid'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : loan.is_installment
                                          ? 'bg-blue-50 text-blue-700'
                                          : 'bg-indigo-50 text-indigo-700'
                                      }`}
                                    >
                                      {loan.status === 'paid'
                                        ? 'Paid'
                                        : loan.is_installment
                                        ? `${loan.installment_months}M Installment`
                                        : 'Advance'}
                                    </span>

                                    {loan.credit_card && (
                                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <CreditCardIcon className="w-3 h-3 text-slate-400" />
                                        {loan.credit_card.bank_name} •••• {loan.credit_card.last_4}
                                      </span>
                                    )}
                                  </div>

                                  <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-xs truncate block mt-1">
                                    {loan.reason || 'Personal Advance'}
                                  </span>

                                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
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
                                      loan.status === 'paid' ? 'text-emerald-600' : 'text-slate-900'
                                    }`}
                                  >
                                    {formatMoney(loan.balance_remaining)}
                                  </span>
                                  {Number(loan.amount) > Number(loan.balance_remaining) && loan.status !== 'paid' && (
                                    <span className="text-xs text-slate-400 block">
                                      of {formatMoney(Number(loan.amount))}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar inside line item */}
                              <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-50">
                                <div className="w-28 sm:w-36 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${math.percentPaid}%` }}
                                  />
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  {loan.status !== 'paid' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLoanForPayment(loan);
                                      }}
                                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                    >
                                      + Settle
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, loan.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                    title="Delete loan"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  <span className="text-blue-600 p-0.5 group-hover:translate-x-0.5 transition-transform">
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
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContactIdForLoan(group.contactId !== 'unknown' ? group.contactId : '');
                        setIsLoanModalOpen(true);
                      }}
                      className="bili-btn-secondary text-xs py-2 px-3.5 font-semibold flex items-center gap-1.5 shadow-xs text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Advance
                    </button>

                    {group.totalOwed > 0 && group.loans.find((l) => l.status !== 'paid') ? (
                      <button
                        type="button"
                        onClick={() => {
                          const firstUnpaid = group.loans.find((l) => l.status !== 'paid');
                          if (firstUnpaid) setSelectedLoanForPayment(firstUnpaid);
                        }}
                        className="bili-btn-primary text-xs py-2 px-3.5 font-semibold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        + Record Repayment
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> All Clear
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lazy Load Button for Entities */}
          {groupedEntities.length > entityVisibleCount && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setEntityVisibleCount((prev) => prev + 8)}
                className="bili-btn-secondary px-6 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Load More Entities ({groupedEntities.length - entityVisibleCount} remaining)
              </button>
              <p className="text-xs text-slate-400 mt-2">
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
                <div
                  key={loan.id}
                  onClick={() => router.push(`/dashboard/loans/${loan.id}`)}
                  className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm overflow-hidden min-w-0 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {loan.contact?.name || 'Borrower'}
                          </h3>
                          {loan.is_installment && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {loan.installment_months} Mos Installment
                            </span>
                          )}
                          {loan.credit_card && (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                              <CreditCardIcon className="w-3 h-3 text-slate-500" />
                              {loan.credit_card.bank_name} •••• {loan.credit_card.last_4}
                            </span>
                          )}
                          {loan.downpayment_amount && loan.downpayment_amount > 0 ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 inline-flex items-center gap-1">
                              ₱{Number(loan.downpayment_amount).toLocaleString()} Downpayment
                            </span>
                          ) : null}
                        </div>
                        {loan.reason && (
                          <p className="text-xs text-slate-500 mt-1">
                            {loan.reason}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
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

                    {/* Balance Display */}
                    <div className="mt-4 p-4 rounded-2xl bg-[#F6F7F9]">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="text-xs text-slate-400 font-medium block">
                            Remaining Balance
                          </span>
                          <span className="text-2xl font-extrabold text-slate-900">
                            {formatMoney(loan.balance_remaining)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          of {formatMoney(loan.amount)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                          style={{ width: `${math.percentPaid}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 font-medium mt-1.5">
                        <span>{formatMoney(math.paidAmount)} repaid</span>
                        <span>{math.percentPaid}% complete</span>
                      </div>
                    </div>

                    {/* Installment / Due Date info banner */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>Lent: {formatDate(loan.loaned_on)}</span>
                        {loan.is_installment && loan.monthly_due_day && (
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                            Due day {loan.monthly_due_day} of month
                          </span>
                        )}
                        {!loan.is_installment && loan.due_date && (
                          <span className="font-semibold text-slate-600">
                            Target return: {formatDate(loan.due_date)}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        {loan.is_installment ? 'View Schedule' : 'View Details'} <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between">
                    {loan.status !== 'paid' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLoanForPayment(loan);
                        }}
                        className="bili-btn-primary py-2 px-4 text-xs font-semibold shadow-sm cursor-pointer"
                      >
                        + Record Repayment
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Settled
                      </span>
                    )}

                    <button
                      onClick={(e) => handleDelete(e, loan.id)}
                      className="text-xs font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lazy Load Button */}
          {filteredLoans.length > visibleCount && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="bili-btn-secondary px-6 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Load More Loans ({filteredLoans.length - visibleCount} remaining)
              </button>
              <p className="text-xs text-slate-400 mt-2">
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

