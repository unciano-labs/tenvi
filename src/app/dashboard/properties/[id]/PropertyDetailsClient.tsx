'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  HandCoins,
  Building2,
  Car,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Receipt,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  Filter,
  CreditCard as CreditCardIcon,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  FileText,
  ExternalLink,
  Tag,
  Store,
  Trees,
  Wrench,
  Layers,
  Landmark,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Property,
  Transaction,
  Category,
  CreditCard,
  PropertyType,
  PropertyDocument,
  Loan,
  Liability,
  SavingsAccount,
} from '@/types';
import {
  formatMoney,
  formatDate,
  calculatePropertyFinancials,
  calculateNextAmortizationSplit,
  calculateStraightLineDepreciation,
} from '@/lib/finance/calculations';
import { PropertyModal } from '@/components/Forms/PropertyModal';
import { PropertyTransactionModal } from '@/components/Forms/PropertyTransactionModal';
import { LiabilityModal } from '@/components/Forms/LiabilityModal';
import { AmortizationScheduleModal } from '@/components/Forms/AmortizationScheduleModal';
import { PropertyDocumentsSection } from '@/components/Properties/PropertyDocumentsSection';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { deletePropertyAction } from '@/app/actions/properties';
import { deleteTransactionAction } from '@/app/actions/transactions';
import { deleteLiabilityAction, recordLiabilityPaymentAction } from '@/app/actions/liabilities';
import { confirmModal } from '@/components/ui/GlobalDialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';

interface PropertyDetailsClientProps {
  property: Property;
  transactions: Transaction[];
  categories: Category[];
  allProperties: Property[];
  creditCards: CreditCard[];
  documents?: PropertyDocument[];
  propertyContact?: { id: string; name: string } | null;
  payables?: Loan[];
  liabilities?: Liability[];
  savingsAccounts?: SavingsAccount[];
}

export interface UnifiedPropertyLedgerItem {
  id: string;
  kind: 'income' | 'expense' | 'advance' | 'transfer';
  title: string;
  categoryName?: string;
  amount: number;
  occurredOn: string;
  paymentMethod: string;
  creditCard?: CreditCard | null;
  isAdvance?: boolean;
  balanceRemaining?: number;
  status?: string;
  loanId?: string;
  txId?: string;
}

export function PropertyDetailsClient({
  property,
  transactions,
  categories,
  allProperties,
  creditCards,
  documents = [],
  propertyContact = null,
  payables = [],
  liabilities = [],
  savingsAccounts = [],
}: PropertyDetailsClientProps) {

  const router = useRouter();

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txKind, setTxKind] = useState<'income' | 'expense'>('income');

  // Liabilities state
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [payingLiability, setPayingLiability] = useState<Liability | null>(null);
  const [selectedAmortizationLiability, setSelectedAmortizationLiability] = useState<Liability | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSavingsId, setPaymentSavingsId] = useState(savingsAccounts[0]?.id || '');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // Live amortization breakdown for liability payment dialog
  const paymentSplit = useMemo(() => {
    if (!payingLiability) return null;
    const amount = Number(paymentAmount) || 0;
    if (amount <= 0) return null;

    return calculateNextAmortizationSplit({
      currentBalance: Number(payingLiability.current_principal_balance || 0),
      annualInterestRate: Number(payingLiability.annual_interest_rate || 0),
      monthlyPayment: amount,
    });
  }, [payingLiability, paymentAmount]);

  // Ledger filter state
  const [kindFilter, setKindFilter] = useState<'all' | 'advance' | 'expense' | 'income'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeletingTxId, setIsDeletingTxId] = useState<string | null>(null);

  // Financial calculations (automatically factoring in linked mortgages/liabilities & payables)
  const financials = useMemo(() => {
    return calculatePropertyFinancials(property, transactions, liabilities, payables);
  }, [property, transactions, liabilities, payables]);

  // Debt & Equity calculations
  const totalLinkedLiabilities = useMemo(() => {
    return (liabilities || [])
      .filter((l) => l.status === 'active')
      .reduce((acc, l) => acc + Number(l.current_principal_balance || 0), 0);
  }, [liabilities]);

  const netOwnerEquity = useMemo(() => {
    return Math.max(0, Number(property.estimated_value || 0) - totalLinkedLiabilities);
  }, [property.estimated_value, totalLinkedLiabilities]);

  const equityPercentage = useMemo(() => {
    const val = Number(property.estimated_value || 0);
    if (val <= 0) return 100;
    return Math.min(100, Math.round((netOwnerEquity / val) * 100));
  }, [property.estimated_value, netOwnerEquity]);

  // Straight-line asset depreciation (Vehicles & Equipment)
  const depreciation = useMemo(() => {
    if (
      (property.property_type === 'vehicle' || property.property_type === 'equipment') &&
      property.purchase_price &&
      property.purchase_date
    ) {
      return calculateStraightLineDepreciation({
        purchasePrice: Number(property.purchase_price),
        purchaseDate: property.purchase_date,
        usefulLifeYears: property.property_type === 'vehicle' ? 5 : 10,
      });
    }
    return null;
  }, [property.property_type, property.purchase_price, property.purchase_date]);

  // Payables & cash advances calculations (from Receivables assigned to this asset)
  const totalPayablesOwed = useMemo(() => {
    return payables.reduce((acc, p) => acc + Number(p.balance_remaining || 0), 0);
  }, [payables]);

  const totalAdvancesOriginated = useMemo(() => {
    return payables.reduce(
      (acc, p) => acc + Number(p.amount || 0) + Number(p.total_interest || 0),
      0
    );
  }, [payables]);

  // Unified ledger items combining direct transactions and payables/advances
  const unifiedLedgerItems: UnifiedPropertyLedgerItem[] = useMemo(() => {
    const list: UnifiedPropertyLedgerItem[] = [];

    // 1. Transactions from bili_transactions
    transactions.forEach((t) => {
      list.push({
        id: `tx-${t.id}`,
        kind: t.kind,
        title: t.note || (t.kind === 'income' ? 'Asset Revenue' : t.kind === 'transfer' ? 'Asset Transfer' : 'Operating Expense'),
        categoryName: t.category?.name,
        amount: Number(t.amount || 0),
        occurredOn: t.occurred_on,
        paymentMethod: t.payment_method,
        creditCard: t.credit_card,
        isAdvance: false,
        txId: t.id,
      });
    });

    // 2. Payables & cash advances from bili_loans (Receivables assigned to this asset)
    payables.forEach((p) => {
      list.push({
        id: `loan-${p.id}`,
        kind: 'advance',
        title: p.reason || 'Operational Cash Advance',
        categoryName: 'Payable / Advance',
        amount: Number(p.amount || 0),
        occurredOn: p.loaned_on,
        paymentMethod: p.credit_card
          ? `${p.credit_card.bank_name || p.credit_card.name} •• ${p.credit_card.last_4}`
          : 'Personal Advance',
        creditCard: p.credit_card,
        isAdvance: true,
        balanceRemaining: Number(p.balance_remaining || 0),
        status: p.status,
        loanId: p.id,
      });
    });

    return list.sort(
      (a, b) => new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime()
    );
  }, [transactions, payables]);

  // Filtered unified ledger items
  const filteredLedgerItems = useMemo(() => {
    return unifiedLedgerItems.filter((item) => {
      const matchesKind =
        kindFilter === 'all'
          ? true
          : kindFilter === 'advance'
          ? item.isAdvance
          : item.kind === kindFilter;

      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesKind && matchesSearch;
    });
  }, [unifiedLedgerItems, kindFilter, searchQuery]);

  const handleDeleteProperty = async () => {
    const confirmed = await confirmModal({
      title: 'Delete Property?',
      description: `Are you sure you want to delete "${property.name}"? Transactions assigned to this property will remain in your global history.`,
      confirmText: 'Delete Property',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    const res = await deletePropertyAction(property.id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Property removed.');
      router.push('/dashboard/properties');
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const confirmed = await confirmModal({
      title: 'Delete Transaction?',
      description: 'Are you sure you want to delete this property transaction? This action cannot be undone.',
      confirmText: 'Delete Transaction',
      variant: 'danger',
    });
    if (!confirmed) return;

    setIsDeletingTxId(txId);
    const res = await deleteTransactionAction(txId);
    setIsDeletingTxId(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Transaction removed.');
      router.refresh();
    }
  };

  const handleOpenTx = (kind: 'income' | 'expense') => {
    setTxKind(kind);
    setIsTxModalOpen(true);
  };

  const getAssetIcon = (type: PropertyType) => {
    switch (type) {
      case 'vehicle':
        return Car;
      case 'real_estate':
        return Building2;
      case 'commercial':
        return Store;
      case 'land':
        return Trees;
      case 'equipment':
        return Wrench;
      default:
        return Layers;
    }
  };

  const Icon = getAssetIcon(property.property_type);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/properties"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors duration-(--motion-fast) w-fit outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all properties
        </Link>

        <div className="page-header-actions">
          <Button
            size="sm"
            variant="soft"
            onClick={() => handleOpenTx('income')}
            className="gap-1.5"
          >
            <ArrowDownRight className="w-4 h-4 text-success" />
            Log income
          </Button>

          <Button
            size="sm"
            variant="soft"
            onClick={() => handleOpenTx('expense')}
            className="gap-1.5"
          >
            <ArrowUpRight className="w-4 h-4 text-danger" />
            Log expense
          </Button>

          <Button
            size="sm"
            variant="soft"
            onClick={() => setIsEditModalOpen(true)}
            className="gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Button>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleDeleteProperty}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Delete property"
            aria-label="Delete property"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Property Header Banner */}
      <Card className="rounded-3xl p-5 sm:p-8 min-w-0 flex-row flex-wrap items-center justify-between gap-6">
        <div className="flex items-start gap-4 min-w-0 flex-1 basis-72">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-display text-foreground min-w-0">
                {property.name}
              </h1>
              <Badge
                variant={
                  property.status === 'active'
                    ? 'success'
                    : property.status === 'maintenance'
                    ? 'warning'
                    : 'neutral'
                }
                className="capitalize font-semibold"
              >
                {property.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium flex-wrap">
              <span className="capitalize">{property.property_type.replace('_', ' ')}</span>
              {property.identifier && (
                <>
                  <span>•</span>
                  <Badge variant="soft" className="font-semibold uppercase text-2xs">
                    {property.identifier}
                  </Badge>
                </>
              )}
              {property.purchase_date && (
                <>
                  <span>•</span>
                  <span>Acquired {formatDate(property.purchase_date)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Valuation & Net Equity display */}
        <div className="@container p-4 rounded-2xl bg-muted/60 flex-1 basis-56 max-w-sm min-w-0 flex flex-col gap-2">
          <div>
            <span className="text-label text-muted-foreground block">
              Market valuation
            </span>
            <span className="num text-[length:min(var(--text-figure),11cqi)] font-bold leading-tight tracking-tight text-foreground block whitespace-nowrap">
              {formatMoney(property.estimated_value)}
            </span>
          </div>
          {totalLinkedLiabilities > 0 && (
            <div>
              <span className="text-xs font-medium text-success block">
                Net owner equity ({equityPercentage}%)
              </span>
              <span className="num text-base font-bold text-success block">
                {formatMoney(netOwnerEquity)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Financial KPIs */}
      <div
        className="grid-fluid gap-4 [--grid-min:13rem]"
      >
        <StatCard
          label="Market valuation"
          value={formatMoney(property.estimated_value)}
          subtext={`Acquisition: ${formatMoney(property.purchase_price || 0)}`}
          icon={Building2}
          variant="neutral"
          className="@container [&_.text-figure]:text-[length:min(var(--text-figure),11cqi)] [&_.text-figure]:whitespace-nowrap [&_.text-figure]:break-normal"
        />

        <StatCard
          label="Net owner equity"
          value={formatMoney(netOwnerEquity)}
          subtext={`${equityPercentage}% owned • ${formatMoney(totalLinkedLiabilities)} debt`}
          icon={ShieldCheck}
          variant={netOwnerEquity > 0 ? 'positive' : 'warning'}
          className="@container [&_.text-figure]:text-[length:min(var(--text-figure),11cqi)] [&_.text-figure]:whitespace-nowrap [&_.text-figure]:break-normal"
        />

        <StatCard
          label="Total income"
          value={formatMoney(financials.totalIncome)}
          subtext={`${financials.incomeCount} revenue entries logged`}
          icon={TrendingUp}
          variant="positive"
          className="@container [&_.text-figure]:text-[length:min(var(--text-figure),11cqi)] [&_.text-figure]:whitespace-nowrap [&_.text-figure]:break-normal"
        />

        <StatCard
          label="Total expenses"
          value={formatMoney(financials.totalExpense)}
          subtext={`${financials.expenseCount} operating expenses`}
          icon={TrendingDown}
          variant="negative"
          className="@container [&_.text-figure]:text-[length:min(var(--text-figure),11cqi)] [&_.text-figure]:whitespace-nowrap [&_.text-figure]:break-normal"
        />

        {payables.length > 0 && (
          <StatCard
            label="Advances and payables"
            value={formatMoney(totalPayablesOwed)}
            subtext={`${payables.length} advances owed to owner`}
            icon={HandCoins}
            variant="warning"
          className="@container [&_.text-figure]:text-[length:min(var(--text-figure),11cqi)] [&_.text-figure]:whitespace-nowrap [&_.text-figure]:break-normal"
        />
        )}

        <StatCard
          label="Net operating return"
          value={formatMoney(financials.netCashFlow)}
          subtext={
            financials.netCashFlow >= 0
              ? 'Positive operating margin'
              : 'Negative cash flow to date'
          }
          icon={Sparkles}
          variant={financials.netCashFlow >= 0 ? 'positive' : 'warning'}
          className="@container [&_.text-figure]:text-[length:min(var(--text-figure),11cqi)] [&_.text-figure]:whitespace-nowrap [&_.text-figure]:break-normal"
        />
      </div>

      {/* Obligations & Schedule Profile Card */}
      <div className="grid grid-cols-1 @4xl/main:grid-cols-2 gap-6">
        {/* Left: Fixed Obligations (Amortization & Insurance) */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 sm:p-6 shadow-card flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-2 text-title text-foreground">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            Fixed obligations and schedule
          </div>

          <div className="space-y-3">
            {/* Monthly Amortization */}
            <div className="p-4 rounded-2xl bg-primary/10 text-foreground flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                    Monthly Loan Amortization
                  </span>
                  {financials.computedFromLoans && (
                    <Badge variant="outline" className="text-2xs px-1.5 py-0 font-semibold bg-primary/10 text-primary">
                      Auto-computed ({financials.linkedLoanCount} loan{financials.linkedLoanCount === 1 ? '' : 's'})
                    </Badge>
                  )}
                </div>
                <span className="text-xl font-extrabold text-blue-950 dark:text-blue-200 block">
                  {formatMoney(financials.monthlyAmortization)}
                  <span className="text-xs font-normal text-blue-700 dark:text-blue-400 ml-1">/ month</span>
                </span>
                <div className="text-xs text-blue-800 dark:text-blue-300">
                  {property.amortization_due_day ? (
                    <span>Due every {property.amortization_due_day}th of the month</span>
                  ) : financials.amortizationDue ? (
                    <span>Next Due: {formatDate(financials.amortizationDue.nextDueDate)} ({financials.amortizationDue.label})</span>
                  ) : (
                    <span>No fixed due day set</span>
                  )}
                </div>
                {/* Active Loans summary pills */}
                {financials.activeLoansSummary && financials.activeLoansSummary.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                    {financials.activeLoansSummary.map((loan) => (
                      <span
                        key={loan.id}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-medium"
                      >
                        {loan.lenderName || loan.name}: {formatMoney(loan.monthlyPayment)}/mo
                        {loan.dueDay ? ` (Due ${loan.dueDay}th)` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right shrink-0">
                {financials.amortizationDue ? (
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl inline-block ${
                      financials.amortizationDue.urgency === 'critical'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-danger dark:text-rose-300'
                        : financials.amortizationDue.urgency === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-warning-soft-foreground dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {financials.amortizationDue.label}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
                {Number(financials.monthlyAmortization || 0) > 0 && (
                  <button
                    onClick={() => handleOpenTx('expense')}
                    className="block text-xs font-bold text-primary hover:underline mt-1.5 cursor-pointer"
                  >
                    + Log Payment
                  </button>
                )}
              </div>
            </div>

            {/* Annual Insurance Renewal */}
            <div className="p-4 rounded-2xl bg-muted/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Annual Comprehensive Insurance
                </span>
                <span className="text-xl font-extrabold text-foreground block">
                  {formatMoney(property.annual_insurance_amount)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ year</span>
                </span>
                <div className="text-xs text-muted-foreground">
                  {property.insurance_renewal_date ? (
                    <span>Next Renewal: {financials.insuranceRenewal.formattedDate}</span>
                  ) : (
                    <span>No renewal date set</span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {financials.insuranceRenewal.daysRemaining !== null ? (
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl inline-block ${
                      financials.insuranceRenewal.urgency === 'critical'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-danger dark:text-rose-300'
                        : financials.insuranceRenewal.urgency === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-warning-soft-foreground dark:text-amber-300'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {financials.insuranceRenewal.label}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
                {Number(property.annual_insurance_amount || 0) > 0 && (
                  <button
                    onClick={() => handleOpenTx('expense')}
                    className="block text-xs font-bold text-primary hover:underline mt-1.5 cursor-pointer"
                  >
                    + Log Renewal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Revenue Profile & Reminders */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 sm:p-6 shadow-card flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-2 text-title text-foreground">
            <Receipt className="w-4 h-4 text-success" />
            Revenue Targets & Notes
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-success-soft space-y-2">
              <span className="text-xs font-bold text-emerald-950 block">Target Revenue Run-Rates</span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-xs font-semibold text-success uppercase block">
                    Expected daily boundary
                  </span>
                  <span className="text-base font-extrabold text-emerald-950">
                    {formatMoney(property.expected_income_daily || 0)}
                  </span>
                  <span className="text-xs text-success block">/ day</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-success uppercase block">
                    Expected monthly rental
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {formatMoney(property.expected_income_monthly || 0)}
                  </span>
                  <span className="text-xs text-success block">/ month</span>
                </div>
              </div>
            </div>

            {/* Notes & Reminders */}
            <div className="p-4 rounded-2xl bg-muted space-y-1">
              <span className="text-xs font-bold text-muted-foreground block">
                Operating Notes & Reminders
              </span>
              <p className="text-xs text-foreground leading-relaxed">
                {property.notes || 'No operational notes or maintenance instructions recorded.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Straight-Line Asset Depreciation Profile (Vehicles & Equipment) */}
      {depreciation && (
        <div className="bg-card text-card-foreground rounded-2xl p-5 sm:p-6 shadow-card flex flex-col gap-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-warning-soft text-warning-soft-foreground flex items-center justify-center font-bold shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-foreground">
                    Straight-Line Depreciation & Current Book Value
                  </h3>
                  <Badge variant={depreciation.isFullyDepreciated ? 'warning' : 'neutral'} className="text-xs">
                    {depreciation.isFullyDepreciated
                      ? 'Fully Depreciated'
                      : `${depreciation.percentDepreciated}% Depreciated`}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automated straight-line asset amortization across a {depreciation.usefulLifeYears}-year lifespan with 10% salvage value floor.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 @xl/main:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-muted/60 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Acquisition Cost
              </span>
              <span className="text-base font-extrabold text-foreground">
                {formatMoney(depreciation.costBasis)}
              </span>
              <span className="text-2xs text-muted-foreground block">
                {property.purchase_date ? formatDate(property.purchase_date) : 'Original purchase'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/60 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Current Book Value
              </span>
              <span className="text-base font-extrabold text-foreground">
                {formatMoney(depreciation.currentBookValue)}
              </span>
              <span className="text-2xs text-success font-semibold block">
                Floor: {formatMoney(depreciation.salvageValue)} (Salvage)
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/60 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Accumulated Depr.
              </span>
              <span className="text-base font-extrabold text-danger">
                -{formatMoney(depreciation.accumulatedDepreciation)}
              </span>
              <span className="text-2xs text-muted-foreground block">
                -{depreciation.percentDepreciated}% of depreciable cost
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/60 space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground block">
                Monthly Depreciation
              </span>
              <span className="text-base font-extrabold text-foreground">
                {formatMoney(depreciation.monthlyDepreciation)}
              </span>
              <span className="text-2xs text-muted-foreground block">
                Age: {depreciation.elapsedMonths} of {depreciation.usefulLifeYears * 12} mos
              </span>
            </div>
          </div>

          {/* Depreciation Progress Meter */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold text-muted-foreground">
              <span>Depreciation Progress</span>
              <span>{depreciation.percentDepreciated}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-colors duration-(--motion-fast) duration-500 rounded-full ${
                  depreciation.percentDepreciated >= 80 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${depreciation.percentDepreciated}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mortgages & Asset Debt Liabilities */}
      <div className="bg-card text-card-foreground rounded-2xl p-5 sm:p-6 shadow-card flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground">
                  Mortgages & Debt Liabilities
                </h3>
                <Badge variant={liabilities.length > 0 ? 'warning' : 'neutral'} className="text-xs">
                  {liabilities.filter((l) => l.status === 'active').length} Active • {formatMoney(totalLinkedLiabilities)} Total Debt
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Long-term mortgages, auto loans, or financing secured against {property.name}.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              setEditingLiability(null);
              setIsLiabilityModalOpen(true);
            }}
            className="rounded-2xl font-bold bg-primary/10 text-primary hover:bg-primary/15 w-fit cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Loan / Mortgage
          </Button>
        </div>

        {liabilities.length === 0 ? (
          <div className="p-6 rounded-2xl bg-muted/40 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">No Mortgages or Debt Linked to this Asset</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              If this property has bank financing, adding the mortgage calculates your true Net Owner Equity and tracks amortizations.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingLiability(null);
                setIsLiabilityModalOpen(true);
              }}
              className="rounded-2xl font-bold mt-2"
            >
              + Link Mortgage or Auto Loan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 @2xl/main:grid-cols-2 gap-4">
            {liabilities.map((lib) => {
              const isPaidOff = lib.status === 'paid_off' || Number(lib.current_principal_balance) === 0;
              return (
                <div
                  key={lib.id}
                  className="p-5 rounded-2xl bg-card/60 hover:bg-muted/30 transition-colors space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground truncate block">
                          {lib.name}
                        </span>
                        <Badge
                          variant={isPaidOff ? 'success' : 'warning'}
                          className="text-2xs font-semibold capitalize"
                        >
                          {lib.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-xs text-muted-foreground">
                          Lender: <strong className="text-foreground">{lib.lender_name}</strong> •{' '}
                          <span className="capitalize">{lib.liability_type.replace('_', ' ')}</span>
                        </span>
                        {lib.credit_card && (
                          <Badge variant="outline" className="text-2xs px-1.5 py-0 font-medium text-primary flex items-center gap-1">
                            <CreditCardIcon className="w-2.5 h-2.5" />
                            {lib.credit_card.bank_name} {lib.credit_card.name} (•••• {lib.credit_card.last_4})
                          </Badge>
                        )}
                        {lib.savings && (
                          <Badge variant="outline" className="text-2xs px-1.5 py-0 font-medium text-success flex items-center gap-1">
                            <Landmark className="w-2.5 h-2.5" />
                            {lib.savings.institution_name} - {lib.savings.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => {
                          setEditingLiability(lib);
                          setIsLiabilityModalOpen(true);
                        }}
                        className="rounded-xl text-muted-foreground hover:text-foreground"
                        title="Edit Liability"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={async () => {
                          const confirmed = await confirmModal({
                            title: 'Delete Liability?',
                            description: `Are you sure you want to remove "${lib.name}"?`,
                            confirmText: 'Delete',
                            variant: 'danger',
                          });
                          if (confirmed) {
                            const res = await deleteLiabilityAction(lib.id);
                            if (res?.error) toast.error(res.error);
                            else {
                              toast.success('Liability removed.');
                              router.refresh();
                            }
                          }
                        }}
                        className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Liability"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Outstanding Principal</span>
                      <span className="text-base font-extrabold text-foreground">
                        {formatMoney(lib.current_principal_balance)}
                      </span>
                      {Number(lib.term_months || 0) > 0 ? (
                        <span className="text-2xs text-muted-foreground block">
                          {(lib.paid_installment_numbers?.length ?? (isPaidOff ? lib.term_months : 0))} of {lib.term_months} terms paid
                        </span>
                      ) : Number(lib.original_principal || 0) > 0 ? (
                        <span className="text-2xs text-muted-foreground block">
                          of {formatMoney(lib.original_principal)}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Monthly Amortization</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-extrabold text-foreground">
                          {formatMoney(lib.monthly_payment)}
                        </span>
                        {lib.is_amortization_overridden && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-warning-soft text-warning-soft-foreground font-semibold">
                            Override
                          </span>
                        )}
                      </div>
                      <span className="text-2xs text-muted-foreground block">
                        {lib.due_day ? `Due ${lib.due_day}th of month` : 'No set due date'}
                      </span>
                    </div>
                  </div>

                  {!isPaidOff && (
                    <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">
                        Rate:{' '}
                        <strong>
                          {lib.interest_rate_type === 'monthly_addon'
                            ? `${lib.interest_rate ?? (Number(lib.annual_interest_rate) / 12).toFixed(2)}% / mo (Add-on)`
                            : `${lib.interest_rate ?? lib.annual_interest_rate}% p.a.`}
                        </strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {Number(lib.term_months || 0) > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAmortizationLiability(lib)}
                            className="rounded-xl text-xs font-semibold h-8 px-2.5"
                            title="View Amortization Schedule"
                          >
                            <TrendingDown className="w-3.5 h-3.5 mr-1 text-primary" />
                            Schedule
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setPayingLiability(lib);
                            setPaymentAmount(
                              lib.monthly_payment > 0 ? String(lib.monthly_payment) : String(lib.current_principal_balance)
                            );
                          }}
                          className="rounded-xl text-xs font-bold shadow-card h-8"
                        >
                          Record Payment
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payables & Operational Advances Owed (From Receivables) */}
      <div className="bg-card text-card-foreground rounded-2xl p-5 sm:p-6 shadow-card flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground">
                  Asset Payables & Advances (Due to Owner)
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {payables.filter((p) => p.status !== 'paid').length} Outstanding
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Operational funds, maintenance, or bill shares advanced for {property.name} from your personal accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {propertyContact && (
              <Link
                href={`/dashboard/receivables/${propertyContact.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary bg-primary/10 hover:bg-primary/15 px-3.5 py-2 rounded-xl transition-colors duration-(--motion-fast) cursor-pointer group"
              >
                <span>Manage in Receivables</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Total Payables Summary Card */}
        <div className="grid grid-cols-1 @xl/main:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-muted/60 space-y-1">
            <span className="text-label text-muted-foreground block">
              Total payables outstanding
            </span>
            <span className="num text-xl font-bold text-foreground">
              {formatMoney(totalPayablesOwed)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/60 space-y-1">
            <span className="text-label text-muted-foreground block">
              Total advances recorded
            </span>
            <span className="num text-xl font-bold text-foreground">
              {formatMoney(totalAdvancesOriginated)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-muted/60 space-y-1">
            <span className="text-label text-muted-foreground block">
              Repaid / cleared to date
            </span>
            <span className="num text-xl font-bold text-success">
              {formatMoney(Math.max(0, totalAdvancesOriginated - totalPayablesOwed))}
            </span>
          </div>
        </div>

        {/* Payables List */}
        {payables.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-muted/30 space-y-2">
            <HandCoins className="w-6 h-6 text-muted-foreground mx-auto opacity-70" />
            <p className="text-xs font-semibold text-muted-foreground">
              No outstanding payables currently recorded for this asset.
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When an advance or loan is recorded in Receivables with &quot;{property.name}&quot; as the borrower, it automatically tracks here as an asset payable.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {payables.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/50 hover:bg-muted/70 transition-colors text-xs gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground truncate">
                      {loan.reason || 'Asset Cash Advance'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-2xs ${
                        loan.status === 'paid'
                          ? 'bg-success-soft text-success'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {loan.status === 'paid' ? 'Settled' : 'Payable'}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>Advanced {formatDate(loan.loaned_on)}</span>
                    {loan.due_date && <span>• Due {formatDate(loan.due_date)}</span>}
                    {Number(loan.monthly_interest_rate || 0) > 0 && (
                      <span className="text-primary font-semibold">• {loan.monthly_interest_rate}%/mo</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-bold text-sm block ${
                      loan.status === 'paid' ? 'text-success' : 'text-foreground'
                    }`}
                  >
                    {loan.status === 'paid'
                      ? formatMoney(loan.amount)
                      : formatMoney(loan.balance_remaining)}
                  </span>
                  {loan.status !== 'paid' && Number(loan.amount) > Number(loan.balance_remaining) && (
                    <span className="text-2xs text-muted-foreground block">
                      of {formatMoney(loan.amount)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents & Compliance Vault */}
      <PropertyDocumentsSection
        property={property}
        documents={documents}
      />

      {/* Transaction Ledger Section */}
      <Card className="rounded-3xl p-6 sm:p-8 shadow-card overflow-hidden min-w-0 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">Asset Transaction Ledger</h3>
            <p className="text-xs text-muted-foreground truncate">
              Complete history of income and expenses recorded for {property.name}.
            </p>
          </div>

          {/* Ledger Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Kind */}
            <div className="flex p-1 rounded-2xl bg-muted/80 overflow-x-auto no-scrollbar">
              <Button
                size="xs"
                variant={kindFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setKindFilter('all')}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                All ({unifiedLedgerItems.length})
              </Button>
              {payables.length > 0 && (
                <Button
                  size="xs"
                  variant={kindFilter === 'advance' ? 'default' : 'ghost'}
                  onClick={() => setKindFilter('advance')}
                  className={`rounded-xl text-xs font-bold cursor-pointer ${
                    kindFilter === 'advance' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''
                  }`}
                >
                  Advances & Payables ({payables.length})
                </Button>
              )}
              <Button
                size="xs"
                variant={kindFilter === 'expense' ? 'default' : 'ghost'}
                onClick={() => setKindFilter('expense')}
                className="rounded-xl text-xs font-bold cursor-pointer"
              >
                Expenses ({financials.expenseCount})
              </Button>
              <Button
                size="xs"
                variant={kindFilter === 'income' ? 'default' : 'ghost'}
                onClick={() => setKindFilter('income')}
                className={`rounded-xl text-xs font-bold cursor-pointer ${
                  kindFilter === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                Income ({financials.incomeCount})
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search note, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 h-8 text-xs rounded-xl bg-muted w-44 min-w-0"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table / List */}
        {filteredLedgerItems.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {searchQuery
                ? 'No transactions found matching your search.'
                : 'No transactions recorded for this asset yet.'}
            </p>
            {!searchQuery && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => handleOpenTx('income')}
                  className="rounded-xl bg-success-soft text-success font-bold hover:bg-emerald-500/20"
                >
                  + Log First Income
                </Button>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => handleOpenTx('expense')}
                  className="rounded-xl bg-danger-soft text-danger font-bold hover:bg-rose-500/20"
                >
                  + Log First Expense
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLedgerItems.map((item) => (
              <div
                key={item.id}
                className="py-3.5 sm:py-4 flex items-start justify-between gap-3 hover:bg-muted/50 px-2 rounded-2xl transition-colors min-w-0"
              >
                {/* Left: Icon, Date, Title, Category / Method */}
                <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <div
                    className={`size-9 sm:size-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      item.kind === 'income'
                        ? 'bg-success-soft text-success'
                        : item.kind === 'advance'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-danger-soft text-danger'
                    }`}
                  >
                    {item.kind === 'income' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : item.kind === 'advance' ? (
                      <HandCoins className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {item.title}
                      </span>
                      {item.categoryName && (
                        <span
                          className={`text-2xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            item.isAdvance
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground bg-muted'
                          }`}
                        >
                          {item.categoryName}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      <span>{formatDate(item.occurredOn)}</span>
                      <span className="ml-1.5">• {item.paymentMethod.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="shrink-0 flex items-center gap-2 sm:gap-3 text-right pt-0.5">
                  <div>
                    <span
                      className={`text-sm sm:text-base font-extrabold block whitespace-nowrap ${
                        item.kind === 'income'
                          ? 'text-success'
                          : item.kind === 'advance'
                          ? item.status === 'paid'
                            ? 'text-success'
                            : 'text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {item.kind === 'income' ? '+' : '-'}
                      {formatMoney(item.amount)}
                    </span>
                    <span
                      className={`text-2xs capitalize block font-bold ${
                        item.kind === 'advance'
                          ? item.status === 'paid'
                            ? 'text-success'
                            : 'text-primary'
                          : 'text-muted-foreground font-normal'
                      }`}
                    >
                      {item.kind === 'advance'
                        ? item.status === 'paid'
                          ? 'Settled'
                          : 'Payable Owed'
                        : item.kind}
                    </span>
                  </div>

                  {item.isAdvance && item.loanId ? (
                    <Link
                      href={`/dashboard/loans/${item.loanId}`}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="View Loan Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  ) : item.txId ? (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => handleDeleteTransaction(item.txId!)}
                      disabled={isDeletingTxId === item.txId}
                      className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Delete Transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Property Modal */}
      <PropertyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        property={property}
        liabilities={liabilities}
      />

      {/* Property Transaction Modal */}
      <PropertyTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          router.refresh();
        }}
        properties={allProperties}
        defaultPropertyId={property.id}
        defaultKind={txKind}
        categories={categories}
        creditCards={creditCards}
      />

      {/* Liability Modal */}
      <LiabilityModal
        isOpen={isLiabilityModalOpen}
        onClose={() => {
          setIsLiabilityModalOpen(false);
          setEditingLiability(null);
          router.refresh();
        }}
        liability={editingLiability}
        defaultPropertyId={property.id}
        properties={allProperties}
        creditCards={creditCards}
        savingsAccounts={savingsAccounts}
      />

      {/* Record Liability Payment Dialog */}
      {payingLiability && (
        <ResponsiveDialog open={!!payingLiability} onOpenChange={(open) => !open && setPayingLiability(null)}>
          <ResponsiveDialogContent className="sm:max-w-md p-6 space-y-4">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Record Payment for {payingLiability.name}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Deduct from savings and reduce principal debt balance. This is logged as a transfer without inflating expenses.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Payment Amount *
                </label>
                <MoneyInput
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  placeholder="0.00"
                  className="rounded-2xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Fund From Savings Account (Optional)
                </label>
                <select
                  value={paymentSavingsId}
                  onChange={(e) => setPaymentSavingsId(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-background rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="">Do not deduct from savings (External payment)</option>
                  {savingsAccounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Balance: {formatMoney(s.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Commercial Amortization Breakdown */}
              {payingLiability.annual_interest_rate > 0 && paymentSplit && paymentSplit.interestPortion > 0 && (
                <div className="p-3.5 rounded-2xl bg-muted/60 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span className="flex items-center gap-1.5 text-muted-foreground text-2xs">
                      <TrendingDown className="w-3.5 h-3.5 text-primary" />
                      Amortization Breakdown
                    </span>
                    <span className="text-2xs font-semibold text-muted-foreground">
                      {payingLiability.annual_interest_rate}% p.a.
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-muted-foreground block text-2xs">Principal (Debt Reduction)</span>
                      <span className="font-extrabold text-success text-sm">
                        {formatMoney(paymentSplit.principalPortion)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-2xs">Interest (Financing Expense)</span>
                      <span className="font-extrabold text-warning-soft-foreground text-sm">
                        {formatMoney(paymentSplit.interestPortion)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1 text-[11px] text-muted-foreground">
                    New Principal Balance:{' '}
                    <strong className="text-foreground">{formatMoney(paymentSplit.newBalance)}</strong>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setPayingLiability(null)}
                  disabled={isRecordingPayment}
                  className="rounded-2xl font-bold"
                >
                  Cancel
                </Button>
                <Button
                  disabled={isRecordingPayment || !paymentAmount || Number(paymentAmount) <= 0}
                  onClick={async () => {
                    setIsRecordingPayment(true);
                    try {
                      const res = await recordLiabilityPaymentAction({
                        liabilityId: payingLiability.id,
                        amount: Number(paymentAmount),
                        principalAmount: paymentSplit?.principalPortion,
                        interestAmount: paymentSplit?.interestPortion,
                        paidOn: new Date().toISOString().split('T')[0],
                        savingsAccountId: paymentSavingsId || null,
                        note: `Payment for ${payingLiability.name}`,
                      });
                      if (res?.error) {
                        toast.error(res.error);
                      } else {
                        toast.success(`Payment of ${formatMoney(Number(paymentAmount))} recorded!`);
                        setPayingLiability(null);
                        router.refresh();
                      }
                    } catch (err: any) {
                      toast.error(err.message || 'Payment recording failed.');
                    } finally {
                      setIsRecordingPayment(false);
                    }
                  }}
                  className="rounded-2xl font-bold shadow-card"
                >
                  {isRecordingPayment ? 'Recording...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      )}

      {/* Amortization Schedule Modal */}
      <AmortizationScheduleModal
        isOpen={!!selectedAmortizationLiability}
        onClose={() => setSelectedAmortizationLiability(null)}
        liability={selectedAmortizationLiability}
      />
    </div>
  );
}
