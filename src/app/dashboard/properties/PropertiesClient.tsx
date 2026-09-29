'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Car,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Edit2,
  Trash2,
  Layers,
  Store,
  Trees,
  Wrench,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Property, Transaction, Category, CreditCard, PropertyType, PropertyDocument } from '@/types';
import {
  formatMoney,
  formatDate,
  calculatePropertyFinancials,
  calculateInsuranceRenewal,
  calculateNextDueDate,
  calculateDocumentExpiryStatus,
} from '@/lib/finance/calculations';
import { PropertyModal } from '@/components/Forms/PropertyModal';
import { PropertyTransactionModal } from '@/components/Forms/PropertyTransactionModal';
import { StatCard } from '@/components/UI/StatCard';
import { deletePropertyAction } from '@/app/actions/properties';
import { toast } from 'sonner';
import { confirmModal } from '@/components/UI/GlobalDialog';

interface PropertiesClientProps {
  properties: Property[];
  transactions: Transaction[];
  categories: Category[];
  creditCards: CreditCard[];
  documents?: PropertyDocument[];
}

export function PropertiesClient({
  properties,
  transactions,
  categories,
  creditCards,
  documents = [],
}: PropertiesClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Quick transaction modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalPropertyId, setTxModalPropertyId] = useState<string | undefined>(undefined);
  const [txModalKind, setTxModalKind] = useState<'income' | 'expense'>('income');

  // Open transaction modal for specific property
  const handleOpenTxModal = (propertyId: string, kind: 'income' | 'expense') => {
    setTxModalPropertyId(propertyId);
    setTxModalKind(kind);
    setIsTxModalOpen(true);
  };

  // Open general transaction modal
  const handleOpenGeneralTx = (kind: 'income' | 'expense') => {
    setTxModalPropertyId(properties[0]?.id);
    setTxModalKind(kind);
    setIsTxModalOpen(true);
  };

  const handleDeleteProperty = async (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const confirmed = await confirmModal({
      title: 'Remove Property?',
      description: `Are you sure you want to remove "${property.name}"? Transactions linked to this property will remain in your general history.`,
      confirmText: 'Remove Property',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

    const res = await deletePropertyAction(property.id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Property removed successfully.');
    }
  };

  // Property financials lookup
  const propertyFinancialsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculatePropertyFinancials>>();
    properties.forEach((p) => {
      map.set(p.id, calculatePropertyFinancials(p, transactions));
    });
    return map;
  }, [properties, transactions]);

  // Global Portfolio Overview Calculations
  const portfolioSummary = useMemo(() => {
    let totalValuation = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    let totalMonthlyAmortization = 0;
    let totalAnnualInsurance = 0;
    let activeCount = 0;

    const urgentObligations: Array<{
      property: Property;
      type: 'amortization' | 'insurance';
      amount: number;
      label: string;
      urgency: 'critical' | 'warning' | 'normal';
      daysRemaining: number;
    }> = [];

    properties.forEach((p) => {
      totalValuation += Number(p.estimated_value || 0);
      if (p.status === 'active') activeCount++;

      const fin = propertyFinancialsMap.get(p.id);
      if (fin) {
        totalIncome += fin.totalIncome;
        totalExpense += fin.totalExpense;
        totalMonthlyAmortization += fin.monthlyAmortization;
        totalAnnualInsurance += fin.annualInsurance;

        // Check amortization urgency (due within 7 days)
        if (fin.amortizationDue && fin.amortizationDue.daysRemaining <= 7) {
          urgentObligations.push({
            property: p,
            type: 'amortization',
            amount: fin.monthlyAmortization,
            label: fin.amortizationDue.label,
            urgency: fin.amortizationDue.urgency,
            daysRemaining: fin.amortizationDue.daysRemaining,
          });
        }

        // Check insurance urgency (due within 30 days)
        if (
          fin.insuranceRenewal.daysRemaining !== null &&
          fin.insuranceRenewal.daysRemaining <= 30
        ) {
          urgentObligations.push({
            property: p,
            type: 'insurance',
            amount: fin.annualInsurance,
            label: fin.insuranceRenewal.label,
            urgency: fin.insuranceRenewal.urgency,
            daysRemaining: fin.insuranceRenewal.daysRemaining,
          });
        }
      }
    });

    const netCashFlow = totalIncome - totalExpense;
    const monthlyCommitments = totalMonthlyAmortization + totalAnnualInsurance / 12;

    urgentObligations.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      totalValuation,
      totalIncome,
      totalExpense,
      netCashFlow,
      totalMonthlyAmortization,
      totalAnnualInsurance,
      monthlyCommitments,
      activeCount,
      urgentObligations,
    };
  }, [properties, propertyFinancialsMap]);

  // Documents grouped by property and expiring documents
  const documentInsights = useMemo(() => {
    const docsByProp = new Map<string, PropertyDocument[]>();
    const attentionDocs: Array<{
      document: PropertyDocument;
      propertyName: string;
      status: ReturnType<typeof calculateDocumentExpiryStatus>;
    }> = [];

    for (const doc of documents) {
      if (!docsByProp.has(doc.property_id)) {
        docsByProp.set(doc.property_id, []);
      }
      docsByProp.get(doc.property_id)!.push(doc);

      if (doc.expiry_date) {
        const status = calculateDocumentExpiryStatus(doc.expiry_date, doc.notify_before_days);
        if (status.isExpiringSoon || status.isExpired) {
          const propName =
            doc.property?.name || properties.find((p) => p.id === doc.property_id)?.name || 'Asset';
          attentionDocs.push({
            document: doc,
            propertyName: propName,
            status,
          });
        }
      }
    }

    return {
      docsByProp,
      attentionDocs,
    };
  }, [documents, properties]);

  // Filter properties by search and type
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.identifier && p.identifier.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        selectedType === 'all'
          ? true
          : selectedType === 'vehicle'
          ? p.property_type === 'vehicle'
          : selectedType === 'real_estate'
          ? p.property_type === 'real_estate' || p.property_type === 'commercial' || p.property_type === 'land'
          : p.property_type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [properties, searchQuery, selectedType]);

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

  const getAssetBadgeColor = (type: PropertyType) => {
    switch (type) {
      case 'vehicle':
        return 'bg-blue-50 text-blue-800';
      case 'real_estate':
        return 'bg-purple-50 text-purple-800';
      case 'commercial':
        return 'bg-amber-50 text-amber-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Page Title & Main Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Properties & Asset Fleet
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage vehicles, real estate, income-generating units, daily boundaries, and loan/insurance renewals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenGeneralTx('income')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
            + Log Income
          </button>

          <button
            onClick={() => handleOpenGeneralTx('expense')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            + Log Expense
          </button>

          <button
            onClick={() => {
              setEditingProperty(null);
              setIsAddPropertyModalOpen(true);
            }}
            className="bili-btn-primary py-2.5 px-5 text-xs font-bold shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Property / Vehicle
          </button>
        </div>
      </div>

      {/* Portfolio Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Portfolio Value"
          value={formatMoney(portfolioSummary.totalValuation)}
          subtext={`${properties.length} total assets (${portfolioSummary.activeCount} active)`}
          icon={Building2}
          variant="neutral"
        />

        <StatCard
          label="Total Asset Income"
          value={formatMoney(portfolioSummary.totalIncome)}
          subtext="Boundary, fares, rentals logged"
          icon={TrendingUp}
          variant="positive"
        />

        <StatCard
          label="Operating Expenses"
          value={formatMoney(portfolioSummary.totalExpense)}
          subtext="Amortizations, PMS, repairs, insurance"
          icon={TrendingDown}
          variant="negative"
        />

        <StatCard
          label="Net Cash Flow"
          value={formatMoney(portfolioSummary.netCashFlow)}
          subtext={
            portfolioSummary.netCashFlow >= 0
              ? 'Positive operating return'
              : 'Negative cash flow (investing phase)'
          }
          icon={Sparkles}
          variant={portfolioSummary.netCashFlow >= 0 ? 'positive' : 'warning'}
        />
      </div>

      {/* Monthly Commitments Quick Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs uppercase font-bold text-slate-400 tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Monthly Run-Rate Commitments
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatMoney(portfolioSummary.monthlyCommitments)}
            <span className="text-xs font-normal text-slate-500 ml-1.5">/ month required</span>
          </div>
          <p className="text-xs text-slate-500">
            Includes {formatMoney(portfolioSummary.totalMonthlyAmortization)} in monthly loan amortizations +{' '}
            {formatMoney(portfolioSummary.totalAnnualInsurance / 12)} /mo annual insurance reserve.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="p-3.5 rounded-2xl bg-[#F6F7F9] min-w-[140px]">
            <span className="text-xs font-bold text-slate-500 block uppercase">
              Total Monthly Loans
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {formatMoney(portfolioSummary.totalMonthlyAmortization)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F6F7F9] min-w-[140px]">
            <span className="text-xs font-bold text-slate-500 block uppercase">
              Annual Insurance Total
            </span>
            <span className="text-base font-extrabold text-slate-900">
              {formatMoney(portfolioSummary.totalAnnualInsurance)}
            </span>
          </div>
        </div>
      </div>

      {/* Urgent Asset Obligations Alert Banner */}
      {portfolioSummary.urgentObligations.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50/80 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
            <h4 className="text-sm font-bold text-amber-950">
              Upcoming Fixed Obligations ({portfolioSummary.urgentObligations.length} due soon)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {portfolioSummary.urgentObligations.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {item.property.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {item.type === 'amortization' ? 'Amortization' : 'Insurance'}:{' '}
                      {item.label}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {formatMoney(item.amount)}
                  </span>
                  <button
                    onClick={() => handleOpenTxModal(item.property.id, 'expense')}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline mt-0.5 cursor-pointer"
                  >
                    Pay / Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Renewal & Compliance Alerts Banner */}
      {documentInsights.attentionDocs.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50/80 border border-amber-200/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-700 shrink-0" />
              <h4 className="text-sm font-bold text-amber-950">
                Asset Document Expirations & Renewals ({documentInsights.attentionDocs.length} requiring attention)
              </h4>
            </div>
            <span className="text-xs font-semibold text-amber-800">
              LTO OR/CR, Insurance Policies, LTFRB Franchises
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {documentInsights.attentionDocs.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3 border border-amber-200/60"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {item.propertyName}
                  </span>
                  <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                    {item.document.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold mt-1">
                    <span className={`px-2 py-0.5 rounded-md text-xs ${item.status.badgeClass}`}>
                      {item.status.label}
                    </span>
                    {item.document.document_number && (
                      <span className="text-xs text-slate-400 font-mono">
                        #{item.document.document_number}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/dashboard/properties/${item.document.property_id}`}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shrink-0 transition-colors"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Type tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#F6F7F9] overflow-x-auto">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedType === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Assets ({properties.length})
          </button>
          <button
            onClick={() => setSelectedType('vehicle')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'vehicle'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Vehicles ({properties.filter((p) => p.property_type === 'vehicle').length})
          </button>
          <button
            onClick={() => setSelectedType('real_estate')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              selectedType === 'real_estate'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Real Estate (
            {
              properties.filter(
                (p) =>
                  p.property_type === 'real_estate' ||
                  p.property_type === 'commercial' ||
                  p.property_type === 'land'
              ).length
            }
            )
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assets, plates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
          />
        </div>
      </div>

      {/* Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              {searchQuery ? 'No matching properties found' : 'No properties or assets yet'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? 'Try adjusting your search keyword or filters.'
                : 'Add your cars, Grab/taxi vehicles, or rental condos to track daily boundaries, amortizations, and annual insurance.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => {
                setEditingProperty(null);
                setIsAddPropertyModalOpen(true);
              }}
              className="bili-btn-primary py-2.5 px-5 text-xs font-semibold shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Property / Vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const financials =
              propertyFinancialsMap.get(property.id) ??
              calculatePropertyFinancials(property, transactions);
            const Icon = getAssetIcon(property.property_type);

            return (
              <div
                key={property.id}
                className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden min-w-0 hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
              >
                {/* Header: Icon, Name, Identifier, Status */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                          {property.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${getAssetBadgeColor(
                              property.property_type
                            )}`}
                          >
                            {property.property_type.replace('_', ' ')}
                          </span>
                          {property.identifier && (
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                              {property.identifier}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingProperty(property);
                          setIsAddPropertyModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit Property"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProperty(property, e)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Valuation */}
                  <div className="p-3.5 rounded-2xl bg-[#F6F7F9] mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Estimated Market Valuation
                      </span>
                      <span className="text-lg font-extrabold text-slate-900">
                        {formatMoney(property.estimated_value)}
                      </span>
                    </div>

                    {property.status && (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                          property.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800'
                            : property.status === 'maintenance'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {property.status}
                      </span>
                    )}
                  </div>

                  {/* Financial Flow: In vs Out vs Net */}
                  {financials && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-slate-50/70 mb-4">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">
                          Income
                        </span>
                        <span className="text-xs font-bold text-emerald-700 block truncate">
                          +{formatMoney(financials.totalIncome)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">
                          Expense
                        </span>
                        <span className="text-xs font-bold text-rose-700 block truncate">
                          -{formatMoney(financials.totalExpense)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block">
                          Net Cash
                        </span>
                        <span
                          className={`text-xs font-extrabold block truncate ${
                            financials.netCashFlow >= 0 ? 'text-emerald-800' : 'text-rose-800'
                          }`}
                        >
                          {formatMoney(financials.netCashFlow)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Commitments & Targets: Amortization, Insurance, Boundary */}
                  <div className="space-y-2 text-xs">
                    {/* Monthly Amortization */}
                    {Number(property.monthly_amortization || 0) > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50">
                        <div className="flex items-center gap-1.5 text-blue-950 font-medium">
                          <Receipt className="w-3.5 h-3.5 text-blue-700" />
                          <span>Monthly Amort:</span>
                          <span className="font-bold">{formatMoney(property.monthly_amortization)}</span>
                        </div>
                        {financials?.amortizationDue && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              financials.amortizationDue.urgency === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : financials.amortizationDue.urgency === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {financials.amortizationDue.label}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Annual Insurance Renewal */}
                    {Number(property.annual_insurance_amount || 0) > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                          <span>Yearly Insurance:</span>
                          <span className="font-bold">{formatMoney(property.annual_insurance_amount)}</span>
                        </div>
                        {financials?.insuranceRenewal.daysRemaining !== null && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              financials.insuranceRenewal.urgency === 'critical'
                                ? 'bg-rose-100 text-rose-800'
                                : financials.insuranceRenewal.urgency === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {financials.insuranceRenewal.label}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Daily Boundary or Expected Rental */}
                    {Number(property.expected_income_daily || 0) > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/40 text-xs text-emerald-950">
                        <span>Expected Daily Boundary:</span>
                        <span className="font-bold text-emerald-800">
                          {formatMoney(property.expected_income_daily)} / day
                        </span>
                      </div>
                    )}

                    {Number(property.expected_income_monthly || 0) > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/40 text-xs text-emerald-950">
                        <span>Expected Monthly Rent:</span>
                        <span className="font-bold text-emerald-800">
                          {formatMoney(property.expected_income_monthly)} / mo
                        </span>
                      </div>
                    )}

                    {/* Documents & Vault Status */}
                    {(() => {
                      const propDocs = documentInsights.docsByProp.get(property.id) || [];
                      const expiringCount = propDocs.filter((d) => {
                        if (!d.expiry_date) return false;
                        const st = calculateDocumentExpiryStatus(d.expiry_date, d.notify_before_days);
                        return st.isExpiringSoon || st.isExpired;
                      }).length;

                      return (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100/60 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Documents Vault:</span>
                            <span className="font-bold text-slate-900">
                              {propDocs.length} {propDocs.length === 1 ? 'doc' : 'docs'}
                            </span>
                          </div>
                          {expiringCount > 0 ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-700" />
                              {expiringCount} renewal alert
                            </span>
                          ) : propDocs.length > 0 ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              Compliant
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">None attached</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenTxModal(property.id, 'income')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Income
                    </button>
                    <button
                      onClick={() => handleOpenTxModal(property.id, 'expense')}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      + Expense
                    </button>
                  </div>

                  <Link
                    href={`/dashboard/properties/${property.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 group"
                  >
                    Details & Ledger
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Property Create/Edit Modal */}
      <PropertyModal
        isOpen={isAddPropertyModalOpen}
        onClose={() => {
          setIsAddPropertyModalOpen(false);
          setEditingProperty(null);
        }}
        property={editingProperty}
      />

      {/* Property Transaction Modal (Income & Expense) */}
      <PropertyTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        properties={properties}
        defaultPropertyId={txModalPropertyId}
        defaultKind={txModalKind}
        categories={categories}
        creditCards={creditCards}
      />
    </div>
  );
}
