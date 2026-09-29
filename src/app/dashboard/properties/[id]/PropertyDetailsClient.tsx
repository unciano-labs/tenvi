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
import { StatCard } from '@/components/UI/StatCard';
import { deletePropertyAction } from '@/app/actions/properties';
import { deleteTransactionAction } from '@/app/actions/transactions';
import { confirmModal } from '@/components/UI/GlobalDialog';

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
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to All Properties & Fleet
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenTx('income')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            + Log Income
          </button>

          <button
            onClick={() => handleOpenTx('expense')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            + Log Expense
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>

          <button
            onClick={handleDeleteProperty}
            className="p-2 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Delete Property"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Property Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <Icon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {property.name}
              </h1>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg uppercase tracking-wider ${
                  property.status === 'active'
                    ? 'bg-emerald-50 text-emerald-800'
                    : property.status === 'maintenance'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {property.status}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
              <span className="capitalize">{property.property_type.replace('_', ' ')}</span>
              {property.identifier && (
                <>
                  <span>•</span>
                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                    {property.identifier}
                  </span>
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
        <div className="p-4 rounded-2xl bg-[#F6F7F9] min-w-[200px] text-left md:text-right">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Current Valuation
          </span>
          <span className="text-2xl font-extrabold text-slate-900 block">
            {formatMoney(property.estimated_value)}
          </span>
          {Number(property.purchase_price || 0) > 0 && (
            <span className="text-[11px] text-slate-500">
              Purchased for {formatMoney(property.purchase_price)}
            </span>
          )}
        </div>
      </div>

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
        <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-slate-400 tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Fixed Obligations & Schedule
          </div>

          <div className="space-y-3">
            {/* Monthly Amortization */}
            <div className="p-4 rounded-2xl bg-blue-50/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-950 block">
                  Monthly Loan Amortization
                </span>
                <span className="text-xl font-extrabold text-blue-950 block">
                  {formatMoney(property.monthly_amortization)}
                  <span className="text-xs font-normal text-blue-700 ml-1">/ month</span>
                </span>
                <div className="text-[11px] text-blue-800">
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
                        ? 'bg-rose-100 text-rose-800'
                        : financials.amortizationDue.urgency === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {financials.amortizationDue.label}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">N/A</span>
                )}
                {Number(property.monthly_amortization || 0) > 0 && (
                  <button
                    onClick={() => handleOpenTx('expense')}
                    className="block text-xs font-bold text-blue-700 hover:text-blue-900 underline mt-1.5 cursor-pointer"
                  >
                    + Log Payment
                  </button>
                )}
              </div>
            </div>

            {/* Annual Insurance Renewal */}
            <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 block">
                  Annual Comprehensive Insurance
                </span>
                <span className="text-xl font-extrabold text-slate-900 block">
                  {formatMoney(property.annual_insurance_amount)}
                  <span className="text-xs font-normal text-slate-500 ml-1">/ year</span>
                </span>
                <div className="text-[11px] text-slate-500">
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
                        ? 'bg-rose-100 text-rose-800'
                        : financials.insuranceRenewal.urgency === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {financials.insuranceRenewal.label}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">N/A</span>
                )}
                {Number(property.annual_insurance_amount || 0) > 0 && (
                  <button
                    onClick={() => handleOpenTx('expense')}
                    className="block text-xs font-bold text-indigo-700 hover:text-indigo-900 underline mt-1.5 cursor-pointer"
                  >
                    + Log Renewal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Revenue Profile & Reminders */}
        <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-slate-400 tracking-wider">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Revenue Targets & Notes
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-emerald-50/50 space-y-2">
              <span className="text-xs font-bold text-emerald-950 block">Target Revenue Run-Rates</span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase block">
                    Expected Daily Boundary
                  </span>
                  <span className="text-base font-extrabold text-emerald-950">
                    {formatMoney(property.expected_income_daily || 0)}
                  </span>
                  <span className="text-[10px] text-emerald-700 block">/ day</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase block">
                    Expected Monthly Rental
                  </span>
                  <span className="text-base font-extrabold text-emerald-950">
                    {formatMoney(property.expected_income_monthly || 0)}
                  </span>
                  <span className="text-[10px] text-emerald-700 block">/ month</span>
                </div>
              </div>
            </div>

            {/* Notes & Reminders */}
            <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Operating Notes & Reminders
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
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

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Asset Transaction Ledger</h3>
            <p className="text-xs text-slate-500">
              Complete history of income and expenses recorded for {property.name}.
            </p>
          </div>

          {/* Ledger Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Kind */}
            <div className="flex p-1 rounded-2xl bg-[#F6F7F9]">
              <button
                onClick={() => setKindFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  kindFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({transactions.length})
              </button>
              <button
                onClick={() => setKindFilter('income')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  kindFilter === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income ({financials.incomeCount})
              </button>
              <button
                onClick={() => setKindFilter('expense')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  kindFilter === 'expense'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expenses ({financials.expenseCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search note, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-2xl bg-[#F6F7F9] text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 w-44"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table / List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {searchQuery
                ? 'No transactions found matching your search.'
                : 'No transactions recorded for this asset yet.'}
            </p>
            {!searchQuery && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenTx('income')}
                  className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  + Log First Income
                </button>
                <button
                  onClick={() => handleOpenTx('expense')}
                  className="px-4 py-2 rounded-2xl bg-rose-50 text-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  + Log First Expense
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-2xl transition-colors"
              >
                {/* Left: Date, Note, Category, Payment Channel */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      tx.kind === 'income'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {tx.kind === 'income' ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-900 block truncate">
                      {tx.note || (tx.kind === 'income' ? 'Property Income' : 'Property Expense')}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span>{formatDate(tx.occurred_on)}</span>
                      {tx.category && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {tx.category.name}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="capitalize font-medium text-slate-600">
                        {tx.payment_method.replace('_', ' ')}
                      </span>
                      {tx.credit_card && (
                        <span className="font-semibold text-indigo-700">
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
                        tx.kind === 'income' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {tx.kind === 'income' ? '+' : '-'}
                      {formatMoney(tx.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 capitalize block">
                      {tx.kind}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteTransaction(tx.id)}
                    disabled={isDeletingTxId === tx.id}
                    className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
