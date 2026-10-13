'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
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
  Tag,
  Store,
  Trees,
  Wrench,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Property, Transaction, Category, CreditCard, PropertyType, PropertyDocument } from '@/types';
import {
  formatMoney,
  formatDate,
  calculatePropertyFinancials,
} from '@/lib/finance/calculations';
import { PropertyModal } from '@/components/Forms/PropertyModal';
import { PropertyTransactionModal } from '@/components/Forms/PropertyTransactionModal';
import { PropertyDocumentsSection } from '@/components/Properties/PropertyDocumentsSection';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { deletePropertyAction } from '@/app/actions/properties';
import { deleteTransactionAction } from '@/app/actions/transactions';
import { confirmModal } from '@/components/ui/GlobalDialog';

interface PropertyDetailsClientProps {
  property: Property;
  transactions: Transaction[];
  categories: Category[];
  allProperties: Property[];
  creditCards: CreditCard[];
  documents?: PropertyDocument[];
}

export function PropertyDetailsClient({
  property,
  transactions,
  categories,
  allProperties,
  creditCards,
  documents = [],
}: PropertyDetailsClientProps) {

  const router = useRouter();

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txKind, setTxKind] = useState<'income' | 'expense'>('income');

  // Ledger filter state
  const [kindFilter, setKindFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeletingTxId, setIsDeletingTxId] = useState<string | null>(null);

  // Financial calculations
  const financials = useMemo(() => {
    return calculatePropertyFinancials(property, transactions);
  }, [property, transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesKind = kindFilter === 'all' || t.kind === kindFilter;
      const matchesSearch =
        !searchQuery ||
        (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.category?.name && t.category.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.payment_method.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesKind && matchesSearch;
    });
  }, [transactions, kindFilter, searchQuery]);

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
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Properties & Fleet
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="soft"
            onClick={() => handleOpenTx('income')}
            className="rounded-2xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            + Log Income
          </Button>

          <Button
            size="sm"
            variant="soft"
            onClick={() => handleOpenTx('expense')}
            className="rounded-2xl bg-rose-50 text-rose-800 hover:bg-rose-100 font-bold"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            + Log Expense
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsEditModalOpen(true)}
            className="rounded-2xl font-bold"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </Button>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleDeleteProperty}
            className="rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Delete Property"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Property Header Banner */}
      <Card className="rounded-3xl p-6 sm:p-8 shadow-xs overflow-hidden min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
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
                className="uppercase tracking-wider font-bold"
              >
                {property.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium flex-wrap">
              <span className="capitalize">{property.property_type.replace('_', ' ')}</span>
              {property.identifier && (
                <>
                  <span>•</span>
                  <Badge variant="outline" className="font-bold uppercase text-[11px]">
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

        {/* Valuation display */}
        <div className="p-4 rounded-2xl bg-muted min-w-[200px] text-left md:text-right">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
            Current Valuation
          </span>
          <span className="text-2xl font-extrabold text-foreground block">
            {formatMoney(property.estimated_value)}
          </span>
          {Number(property.purchase_price || 0) > 0 && (
            <span className="text-xs text-muted-foreground">
              Purchased for {formatMoney(property.purchase_price)}
            </span>
          )}
        </div>
      </Card>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Market Valuation"
          value={formatMoney(property.estimated_value)}
          subtext="Estimated equity value"
          icon={Building2}
          variant="neutral"
        />

        <StatCard
          label="Total Income"
          value={formatMoney(financials.totalIncome)}
          subtext={`${financials.incomeCount} revenue entries logged`}
          icon={TrendingUp}
          variant="positive"
        />

        <StatCard
          label="Total Expenses"
          value={formatMoney(financials.totalExpense)}
          subtext={`${financials.expenseCount} operating expenses`}
          icon={TrendingDown}
          variant="negative"
        />

        <StatCard
          label="Net Operating Return"
          value={formatMoney(financials.netCashFlow)}
          subtext={
            financials.netCashFlow >= 0
              ? 'Positive operating margin'
              : 'Negative cash flow to date'
          }
          icon={Sparkles}
          variant={financials.netCashFlow >= 0 ? 'positive' : 'warning'}
        />
      </div>

      {/* Obligations & Schedule Profile Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Fixed Obligations (Amortization & Insurance) */}
        <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-muted-foreground tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Fixed Obligations & Schedule
          </div>

          <div className="space-y-3">
            {/* Monthly Amortization */}
            <div className="p-4 rounded-2xl bg-blue-500/10 text-foreground flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300 block">
                  Monthly Loan Amortization
                </span>
                <span className="text-xl font-extrabold text-blue-950 dark:text-blue-200 block">
                  {formatMoney(property.monthly_amortization)}
                  <span className="text-xs font-normal text-blue-700 dark:text-blue-400 ml-1">/ month</span>
                </span>
                <div className="text-xs text-blue-800 dark:text-blue-300">
                  {property.amortization_due_day ? (
                    <span>Due every {property.amortization_due_day}th of the month</span>
                  ) : (
                    <span>No fixed due day set</span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                {financials.amortizationDue ? (
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl inline-block ${
                      financials.amortizationDue.urgency === 'critical'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        : financials.amortizationDue.urgency === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                    }`}
                  >
                    {financials.amortizationDue.label}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
                {Number(property.monthly_amortization || 0) > 0 && (
                  <button
                    onClick={() => handleOpenTx('expense')}
                    className="block text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1.5 cursor-pointer"
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
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        : financials.insuranceRenewal.urgency === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
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
        <div className="bg-card text-card-foreground rounded-3xl p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-muted-foreground tracking-wider">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Revenue Targets & Notes
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-emerald-50/50 space-y-2">
              <span className="text-xs font-bold text-emerald-950 block">Target Revenue Run-Rates</span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase block">
                    Expected Daily Boundary
                  </span>
                  <span className="text-base font-extrabold text-emerald-950">
                    {formatMoney(property.expected_income_daily || 0)}
                  </span>
                  <span className="text-xs text-emerald-700 block">/ day</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-emerald-800 uppercase block">
                    Expected Monthly Rental
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {formatMoney(property.expected_income_monthly || 0)}
                  </span>
                  <span className="text-xs text-emerald-500 block">/ month</span>
                </div>
              </div>
            </div>

            {/* Notes & Reminders */}
            <div className="p-4 rounded-2xl bg-muted space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Operating Notes & Reminders
              </span>
              <p className="text-xs text-foreground leading-relaxed">
                {property.notes || 'No operational notes or maintenance instructions recorded.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Documents & Compliance Vault */}
      <PropertyDocumentsSection
        property={property}
        documents={documents}
      />

      {/* Transaction Ledger Section */}
      <Card className="rounded-3xl p-6 sm:p-8 shadow-xs overflow-hidden min-w-0 space-y-6">
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
            <div className="flex p-1 rounded-2xl bg-muted/80">
              <Button
                size="xs"
                variant={kindFilter === 'all' ? 'default' : 'ghost'}
                onClick={() => setKindFilter('all')}
                className="rounded-xl text-xs font-bold"
              >
                All ({transactions.length})
              </Button>
              <Button
                size="xs"
                variant={kindFilter === 'income' ? 'default' : 'ghost'}
                onClick={() => setKindFilter('income')}
                className={`rounded-xl text-xs font-bold ${
                  kindFilter === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                Income ({financials.incomeCount})
              </Button>
              <Button
                size="xs"
                variant={kindFilter === 'expense' ? 'default' : 'ghost'}
                onClick={() => setKindFilter('expense')}
                className="rounded-xl text-xs font-bold"
              >
                Expenses ({financials.expenseCount})
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
        {filteredTransactions.length === 0 ? (
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
                  className="rounded-xl bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20"
                >
                  + Log First Income
                </Button>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => handleOpenTx('expense')}
                  className="rounded-xl bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/20"
                >
                  + Log First Expense
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-4 flex items-center justify-between gap-4 hover:bg-muted/50 px-2 rounded-2xl transition-colors"
              >
                {/* Left: Date, Note, Category, Payment Channel */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.kind === 'income'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {tx.kind === 'income' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-sm font-bold text-foreground block truncate">
                      {tx.note || (tx.kind === 'income' ? 'Property Income' : 'Property Expense')}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{formatDate(tx.occurred_on)}</span>
                      {tx.category && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md">
                            {tx.category.name}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="capitalize font-medium text-muted-foreground">
                        {tx.payment_method.replace('_', ' ')}
                      </span>
                      {tx.credit_card && (
                        <span className="font-semibold text-primary">
                          (•••• {tx.credit_card.last_4})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Delete action */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-base font-extrabold block ${
                        tx.kind === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {tx.kind === 'income' ? '+' : '-'}
                      {formatMoney(tx.amount)}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize block">
                      {tx.kind}
                    </span>
                  </div>

                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => handleDeleteTransaction(tx.id)}
                    disabled={isDeletingTxId === tx.id}
                    className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete Transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
    </div>
  );
}
