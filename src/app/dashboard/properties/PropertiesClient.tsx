'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deletePropertyAction } from '@/app/actions/properties';
import { toast } from 'sonner';
import {
  Building2,
  Car,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Clock,
  ChevronRight,
  Receipt,
  FileText,
  Search,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Trees,
  Wrench,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { PropertyModal } from '@/components/Forms/PropertyModal';
import { PropertyTransactionModal } from '@/components/Forms/PropertyTransactionModal';
import { LiabilityModal } from '@/components/Forms/LiabilityModal';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { confirmModal } from '@/components/ui/GlobalDialog';
import {
  formatMoney,
  calculatePropertyFinancials,
  calculateDocumentExpiryStatus,
} from '@/lib/finance/calculations';
import {
  Property,
  PropertyType,
  Transaction,
  Category,
  CreditCard,
  SavingsAccount,
  PropertyDocument,
  Liability,
} from '@/types';

interface PropertiesClientProps {
  initialProperties?: Property[];
  properties?: Property[];
  transactions: Transaction[];
  categories: Category[];
  creditCards?: CreditCard[];
  savingsAccounts?: SavingsAccount[];
  documents?: PropertyDocument[];
  liabilities?: Liability[];
}

export function PropertiesClient({
  initialProperties,
  properties: propProperties,
  transactions,
  categories,
  creditCards = [],
  savingsAccounts = [],
  documents = [],
  liabilities = [],
}: PropertiesClientProps) {
  const router = useRouter();
  const [properties] = useState<Property[]>(initialProperties || propProperties || []);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

  // Quick Action Modal state (Property Transactions)
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalPropertyId, setTxModalPropertyId] = useState<string | undefined>();
  const [txModalKind, setTxModalKind] = useState<'income' | 'expense'>('income');

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PropertyType | 'all'>('all');

  // Open property-specific transaction modal
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

        if (fin.amortizationDue && (fin.amortizationDue.urgency === 'critical' || fin.amortizationDue.urgency === 'warning')) {
          urgentObligations.push({
            property: p,
            type: 'amortization',
            amount: p.monthly_amortization || 0,
            label: fin.amortizationDue.label,
            urgency: fin.amortizationDue.urgency,
            daysRemaining: fin.amortizationDue.daysRemaining,
          });
        }

        if (fin.insuranceRenewal.urgency !== 'normal') {
          urgentObligations.push({
            property: p,
            type: 'insurance',
            amount: p.annual_insurance_amount || 0,
            label: fin.insuranceRenewal.label,
            urgency: fin.insuranceRenewal.urgency,
            daysRemaining: fin.insuranceRenewal.daysRemaining ?? 30,
          });
        }
      }
    });

    urgentObligations.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const monthlyCommitments = totalMonthlyAmortization + totalAnnualInsurance / 12;
    const netCashFlow = totalIncome - totalExpense;

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

  // Liabilities map per property
  const propertyLiabilitiesMap = useMemo(() => {
    const map = new Map<string, number>();
    (liabilities || []).forEach((l) => {
      if (l.property_id && l.status === 'active') {
        const cur = map.get(l.property_id) || 0;
        map.set(l.property_id, cur + Number(l.current_principal_balance || 0));
      }
    });
    return map;
  }, [liabilities]);

  const totalLiabilitiesBalance = useMemo(() => {
    return (liabilities || [])
      .filter((l) => l.status === 'active')
      .reduce((acc, l) => acc + Number(l.current_principal_balance || 0), 0);
  }, [liabilities]);

  const netPortfolioEquity = Math.max(0, portfolioSummary.totalValuation - totalLiabilitiesBalance);

  // Document insights
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

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Property & Asset Portfolio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage vehicles, real estate, income-generating units, daily boundaries, and loan/insurance renewals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={() => handleOpenGeneralTx('income')}
            className="rounded-xl gap-1.5 font-bold text-xs"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            + Log Income
          </Button>

          <Button
            type="button"
            variant="soft"
            size="sm"
            onClick={() => handleOpenGeneralTx('expense')}
            className="rounded-xl gap-1.5 font-bold text-xs"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            + Log Expense
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingLiability(null);
              setIsLiabilityModalOpen(true);
            }}
            className="rounded-xl gap-1.5 font-bold text-xs"
          >
            <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            + Add Mortgage / Debt
          </Button>

          <Button
            type="button"
            onClick={() => {
              setEditingProperty(null);
              setIsAddPropertyModalOpen(true);
            }}
            className="rounded-xl gap-2 font-bold text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Property / Vehicle
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Stat Cards */}
      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 pb-1 sm:pb-0">
        <StatCard
          label="Total Portfolio Value"
          value={formatMoney(portfolioSummary.totalValuation)}
          subtext={`${properties.length} total assets (${portfolioSummary.activeCount} active)`}
          icon={Building2}
          variant="neutral"
          className="min-w-[240px] max-w-[280px] sm:min-w-0 sm:max-w-none snap-start shrink-0 sm:shrink flex flex-col justify-between"
        />

        <StatCard
          label="Net Portfolio Equity"
          value={formatMoney(netPortfolioEquity)}
          subtext={`${formatMoney(totalLiabilitiesBalance)} debt liabilities`}
          icon={ShieldCheck}
          variant={netPortfolioEquity > 0 ? 'positive' : 'warning'}
          className="min-w-[240px] max-w-[280px] sm:min-w-0 sm:max-w-none snap-start shrink-0 sm:shrink flex flex-col justify-between"
        />

        <StatCard
          label="Total Asset Income"
          value={formatMoney(portfolioSummary.totalIncome)}
          subtext="Boundary, fares, rentals logged"
          icon={TrendingUp}
          variant="positive"
          className="min-w-[240px] max-w-[280px] sm:min-w-0 sm:max-w-none snap-start shrink-0 sm:shrink flex flex-col justify-between"
        />

        <StatCard
          label="Operating Expenses"
          value={formatMoney(portfolioSummary.totalExpense)}
          subtext="Amortizations, PMS, repairs, insurance"
          icon={TrendingDown}
          variant="negative"
          className="min-w-[240px] max-w-[280px] sm:min-w-0 sm:max-w-none snap-start shrink-0 sm:shrink flex flex-col justify-between"
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
          className="min-w-[240px] max-w-[280px] sm:min-w-0 sm:max-w-none snap-start shrink-0 sm:shrink flex flex-col justify-between"
        />
      </div>

      {/* Monthly Commitments Quick Bar */}
      <Card className="p-6 shadow-xs overflow-hidden min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Monthly Run-Rate Commitments
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatMoney(portfolioSummary.monthlyCommitments)}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">/ month required</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Includes {formatMoney(portfolioSummary.totalMonthlyAmortization)} in monthly loan amortizations +{' '}
            {formatMoney(portfolioSummary.totalAnnualInsurance / 12)} /mo annual insurance reserve.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap w-full md:w-auto">
          <div className="p-3.5 rounded-2xl bg-muted/60 flex-1 sm:flex-initial min-w-0 sm:min-w-[140px]">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block truncate">
              Total Monthly Loans
            </span>
            <span className="text-base font-bold text-foreground block">
              {formatMoney(portfolioSummary.totalMonthlyAmortization)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-muted/60 flex-1 sm:flex-initial min-w-0 sm:min-w-[140px]">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block truncate">
              Annual Insurance Total
            </span>
            <span className="text-base font-bold text-foreground block">
              {formatMoney(portfolioSummary.totalAnnualInsurance)}
            </span>
          </div>
        </div>
      </Card>

      {/* Urgent Asset Obligations Alert Banner */}
      {portfolioSummary.urgentObligations.length > 0 && (
        <Card className="p-5 rounded-3xl bg-amber-500/10 space-y-3 min-w-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
              Upcoming Fixed Obligations ({portfolioSummary.urgentObligations.length} due soon)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {portfolioSummary.urgentObligations.map((item, idx) => (
              <div
                key={idx}
                className="bg-card rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground block truncate">
                    {item.property.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5 truncate">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {item.type === 'amortization' ? 'Amortization' : 'Insurance'}:{' '}
                      {item.label}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-foreground block">
                    {formatMoney(item.amount)}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    onClick={() => handleOpenTxModal(item.property.id, 'expense')}
                    className="text-xs font-bold p-0 h-auto"
                  >
                    Pay / Log
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Document Renewal & Compliance Alerts Banner */}
      {documentInsights.attentionDocs.length > 0 && (
        <Card className="p-5 rounded-3xl bg-amber-500/10 space-y-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200 truncate">
                Asset Document Expirations & Renewals ({documentInsights.attentionDocs.length} requiring attention)
              </h4>
            </div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 shrink-0">
              LTO OR/CR, Insurance Policies, LTFRB Franchises
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {documentInsights.attentionDocs.map((item, idx) => (
              <div
                key={idx}
                className="bg-card rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground block truncate">
                    {item.propertyName}
                  </span>
                  <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                    {item.document.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs font-bold mt-1 flex-wrap">
                    <Badge
                      variant={
                        item.status.isExpired
                          ? 'destructive'
                          : item.status.isExpiringSoon
                          ? 'warning'
                          : 'soft'
                      }
                    >
                      {item.status.label}
                    </Badge>
                    {item.document.document_number && (
                      <span className="text-xs text-muted-foreground font-mono">
                        #{item.document.document_number}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  href={`/dashboard/properties/${item.document.property_id}`}
                  className="px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shrink-0 transition-colors"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-3xl shadow-xs overflow-hidden min-w-0">
        {/* Type tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-2xl overflow-x-auto no-scrollbar max-w-full min-w-0">
          <Button
            type="button"
            variant={selectedType === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType('all')}
            className={`rounded-xl text-xs font-bold whitespace-nowrap ${
              selectedType === 'all' ? 'shadow-xs' : 'text-muted-foreground'
            }`}
          >
            All Assets ({properties.length})
          </Button>
          <Button
            type="button"
            variant={selectedType === 'vehicle' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType('vehicle')}
            className={`rounded-xl text-xs font-bold whitespace-nowrap gap-1.5 ${
              selectedType === 'vehicle' ? 'shadow-xs' : 'text-muted-foreground'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Vehicles ({properties.filter((p) => p.property_type === 'vehicle').length})
          </Button>
          <Button
            type="button"
            variant={selectedType === 'real_estate' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedType('real_estate')}
            className={`rounded-xl text-xs font-bold whitespace-nowrap gap-1.5 ${
              selectedType === 'real_estate' ? 'shadow-xs' : 'text-muted-foreground'
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
          </Button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search assets, identifiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>
      </Card>

      {/* Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <Card className="p-12 text-center shadow-xs space-y-4 max-w-md mx-auto">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              {searchQuery ? 'No matching properties found' : 'No properties or assets yet'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? 'Try adjusting your search keyword or filters.'
                : 'Add your cars, Grab/taxi vehicles, or rental condos to track daily boundaries, amortizations, and annual insurance.'}
            </p>
          </div>
          {!searchQuery && (
            <Button
              onClick={() => {
                setEditingProperty(null);
                setIsAddPropertyModalOpen(true);
              }}
              className="rounded-xl gap-2 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add First Property / Vehicle
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const financials =
              propertyFinancialsMap.get(property.id) ??
              calculatePropertyFinancials(property, transactions);
            const propDebt = propertyLiabilitiesMap.get(property.id) || 0;
            const propEquity = Math.max(0, Number(property.estimated_value || 0) - propDebt);
            const Icon = getAssetIcon(property.property_type);

            return (
              <Card
                key={property.id}
                className="p-6 shadow-xs overflow-hidden min-w-0 flex flex-col justify-between space-y-5"
              >
                {/* Header: Icon, Name, Identifier, Status */}
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3 min-w-0">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-snug text-foreground whitespace-normal break-words">
                          {property.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="soft" className="text-xs font-medium uppercase tracking-wider shrink-0">
                            {property.property_type.replace('_', ' ')}
                          </Badge>
                          {property.identifier && (
                            <Badge variant="outline" className="text-xs font-medium uppercase tracking-wider shrink-0">
                              {property.identifier}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setEditingProperty(property);
                          setIsAddPropertyModalOpen(true);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                        title="Edit Property"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => handleDeleteProperty(property, e)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete Property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Valuation & Net Equity */}
                  <div className="p-3.5 rounded-2xl bg-muted/60 mb-4 flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                        Estimated Valuation
                      </span>
                      <span className="text-2xl font-bold tracking-tight text-foreground block">
                        {formatMoney(property.estimated_value)}
                      </span>
                      {propDebt > 0 && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          Net Equity: {formatMoney(propEquity)} ({formatMoney(propDebt)} loan)
                        </span>
                      )}
                    </div>

                    {property.status && (
                      <Badge
                        variant={
                          property.status === 'active'
                            ? 'success'
                            : property.status === 'maintenance'
                            ? 'warning'
                            : 'soft'
                        }
                        className="text-xs font-medium uppercase tracking-wider shrink-0"
                      >
                        {property.status}
                      </Badge>
                    )}
                  </div>

                  {/* Financial Flow: In vs Out vs Net */}
                  {financials && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-muted/40 mb-4 min-w-0">
                      <div className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                          Income
                        </span>
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block">
                          +{formatMoney(financials.totalIncome)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                          Expense
                        </span>
                        <span className="text-xs font-medium text-rose-600 dark:text-rose-400 block">
                          -{formatMoney(financials.totalExpense)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block">
                          Net Cash
                        </span>
                        <span
                          className={`text-xs font-bold block ${
                            financials.netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {formatMoney(financials.netCashFlow)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Commitments & Targets */}
                  <div className="space-y-2 text-xs min-w-0">
                    {/* Monthly Amortization */}
                    {Number(property.monthly_amortization || 0) > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/5 min-w-0 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Receipt className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-muted-foreground shrink-0">Monthly Amort:</span>
                          <span className="font-medium text-foreground">{formatMoney(property.monthly_amortization)}</span>
                        </div>
                        {financials?.amortizationDue && (
                          <Badge
                            variant={
                              financials.amortizationDue.urgency === 'critical'
                                ? 'destructive'
                                : financials.amortizationDue.urgency === 'warning'
                                ? 'warning'
                                : 'soft'
                            }
                            className="shrink-0"
                          >
                            {financials.amortizationDue.label}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Annual Insurance Renewal */}
                    {Number(property.annual_insurance_amount || 0) > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 min-w-0 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground shrink-0">Yearly Insurance:</span>
                          <span className="font-medium text-foreground">{formatMoney(property.annual_insurance_amount)}</span>
                        </div>
                        {financials?.insuranceRenewal.daysRemaining !== null && (
                          <Badge
                            variant={
                              financials.insuranceRenewal.urgency === 'critical'
                                ? 'destructive'
                                : financials.insuranceRenewal.urgency === 'warning'
                                ? 'warning'
                                : 'soft'
                            }
                            className="shrink-0"
                          >
                            {financials.insuranceRenewal.label}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Daily Boundary or Expected Rental */}
                    {Number(property.expected_income_daily || 0) > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 text-xs min-w-0 gap-2">
                        <span className="text-muted-foreground">Expected Daily Boundary:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                          {formatMoney(property.expected_income_daily)} / day
                        </span>
                      </div>
                    )}

                    {Number(property.expected_income_monthly || 0) > 0 && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 text-xs min-w-0 gap-2">
                        <span className="text-muted-foreground">Expected Monthly Rent:</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                          {formatMoney(property.expected_income_monthly)} / mo
                        </span>
                      </div>
                    )}

                    {/* Documents Vault Status */}
                    {(() => {
                      const propDocs = documentInsights.docsByProp.get(property.id) || [];
                      const expiringCount = propDocs.filter((d) => {
                        if (!d.expiry_date) return false;
                        const st = calculateDocumentExpiryStatus(d.expiry_date, d.notify_before_days);
                        return st.isExpiringSoon || st.isExpired;
                      }).length;

                      return (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/60 text-xs min-w-0 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-muted-foreground shrink-0">Documents:</span>
                            <span className="font-medium text-foreground">
                              {propDocs.length} {propDocs.length === 1 ? 'doc' : 'docs'}
                            </span>
                          </div>
                          {expiringCount > 0 ? (
                            <Badge variant="warning" className="gap-1 shrink-0">
                              <AlertCircle className="w-3 h-3" />
                              {expiringCount} alert
                            </Badge>
                          ) : propDocs.length > 0 ? (
                            <Badge variant="success" className="shrink-0">
                              Compliant
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">None</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      size="xs"
                      variant="soft"
                      onClick={() => handleOpenTxModal(property.id, 'income')}
                      className="text-emerald-600 dark:text-emerald-400 font-bold active:scale-[0.99] transition-transform"
                    >
                      + Income
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="soft"
                      onClick={() => handleOpenTxModal(property.id, 'expense')}
                      className="text-rose-600 dark:text-rose-400 font-bold active:scale-[0.99] transition-transform"
                    >
                      + Expense
                    </Button>
                  </div>

                  <Link
                    href={`/dashboard/properties/${property.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-primary group shrink-0"
                  >
                    Details &amp; Ledger
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </Card>
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

      {/* Liability Modal */}
      <LiabilityModal
        isOpen={isLiabilityModalOpen}
        onClose={() => {
          setIsLiabilityModalOpen(false);
          setEditingLiability(null);
          router.refresh();
        }}
        liability={editingLiability}
        properties={properties}
        creditCards={creditCards}
        savingsAccounts={savingsAccounts}
      />
    </div>
  );
}
