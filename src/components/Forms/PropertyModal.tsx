'use client';

import React, { useState, useEffect } from 'react';
import { createPropertyAction, updatePropertyAction } from '@/app/actions/properties';
import { toast } from 'sonner';
import {
  X,
  Building2,
  Car,
  KeyRound,
  ShieldCheck,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Tag,
  Wrench,
  Percent,
} from 'lucide-react';
import { Property, PropertyType, PropertyStatus } from '@/types';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property?: Property | null;
}

const PROPERTY_TYPES: { value: PropertyType; label: string; icon: string }[] = [
  { value: 'vehicle', label: 'Vehicle / Car / Fleet / Taxi', icon: 'Car' },
  { value: 'real_estate', label: 'Real Estate / Condo / House', icon: 'Building' },
  { value: 'commercial', label: 'Commercial / Storefront', icon: 'Store' },
  { value: 'land', label: 'Land / Lot', icon: 'Trees' },
  { value: 'equipment', label: 'Equipment / Machinery', icon: 'Wrench' },
  { value: 'other', label: 'Other Revenue Asset', icon: 'Layers' },
];

const THEME_OPTIONS = [
  { value: 'indigo', label: 'Indigo', bg: '#1e3a8a' },
  { value: 'emerald', label: 'Emerald', bg: '#065f46' },
  { value: 'amber', label: 'Amber', bg: '#92400e' },
  { value: 'rose', label: 'Rose', bg: '#9f1239' },
  { value: 'slate', label: 'Charcoal', bg: '#0f172a' },
];

export function PropertyModal({ isOpen, onClose, property }: PropertyModalProps) {
  const isEditing = !!property;

  const [name, setName] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('vehicle');
  const [identifier, setIdentifier] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [monthlyAmortization, setMonthlyAmortization] = useState('');
  const [amortizationDueDay, setAmortizationDueDay] = useState('');
  const [annualInsuranceAmount, setAnnualInsuranceAmount] = useState('');
  const [insuranceRenewalDate, setInsuranceRenewalDate] = useState('');
  const [expectedIncomeDaily, setExpectedIncomeDaily] = useState('');
  const [expectedIncomeMonthly, setExpectedIncomeMonthly] = useState('');
  const [colorTheme, setColorTheme] = useState('indigo');
  const [status, setStatus] = useState<PropertyStatus>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (property) {
      setName(property.name);
      setPropertyType(property.property_type);
      setIdentifier(property.identifier || '');
      setEstimatedValue(property.estimated_value ? String(property.estimated_value) : '');
      setPurchasePrice(property.purchase_price ? String(property.purchase_price) : '');
      setPurchaseDate(property.purchase_date || '');
      setMonthlyAmortization(
        property.monthly_amortization ? String(property.monthly_amortization) : ''
      );
      setAmortizationDueDay(
        property.amortization_due_day ? String(property.amortization_due_day) : ''
      );
      setAnnualInsuranceAmount(
        property.annual_insurance_amount ? String(property.annual_insurance_amount) : ''
      );
      setInsuranceRenewalDate(property.insurance_renewal_date || '');
      setExpectedIncomeDaily(
        property.expected_income_daily ? String(property.expected_income_daily) : ''
      );
      setExpectedIncomeMonthly(
        property.expected_income_monthly ? String(property.expected_income_monthly) : ''
      );
      setColorTheme(property.color_theme || 'indigo');
      setStatus(property.status || 'active');
      setNotes(property.notes || '');
    } else {
      setName('');
      setPropertyType('vehicle');
      setIdentifier('');
      setEstimatedValue('');
      setPurchasePrice('');
      setPurchaseDate('');
      setMonthlyAmortization('');
      setAmortizationDueDay('');
      setAnnualInsuranceAmount('');
      setInsuranceRenewalDate('');
      setExpectedIncomeDaily('');
      setExpectedIncomeMonthly('');
      setColorTheme('indigo');
      setStatus('active');
      setNotes('');
    }
  }, [property, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a property or asset name.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      name: name.trim(),
      propertyType,
      identifier: identifier.trim() || null,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : 0,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
      purchaseDate: purchaseDate || null,
      monthlyAmortization: monthlyAmortization ? parseFloat(monthlyAmortization) : null,
      amortizationDueDay: amortizationDueDay ? parseInt(amortizationDueDay, 10) : null,
      annualInsuranceAmount: annualInsuranceAmount ? parseFloat(annualInsuranceAmount) : null,
      insuranceRenewalDate: insuranceRenewalDate || null,
      expectedIncomeDaily: expectedIncomeDaily ? parseFloat(expectedIncomeDaily) : null,
      expectedIncomeMonthly: expectedIncomeMonthly ? parseFloat(expectedIncomeMonthly) : null,
      colorTheme,
      status,
      notes: notes.trim() || null,
    };

    const res = isEditing
      ? await updatePropertyAction(property.id, payload)
      : await createPropertyAction(payload);

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(isEditing ? 'Property updated successfully.' : 'Property added successfully.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-xl my-8 space-y-6 max-h-[90vh] overflow-y-auto bili-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              {propertyType === 'vehicle' ? (
                <Car className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                {isEditing ? 'Edit Property / Asset' : 'Add Property or Asset'}
              </h3>
              <p className="text-xs text-slate-500">
                Track revenue, daily boundary/income, amortization, and annual renewals.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Property / Asset Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Toyota Vios Grab #1, BGC One Maridien Studio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Asset Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                className="w-full px-4 py-3 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {propertyType === 'vehicle' ? 'Plate Number / VIN' : 'Unit / Identifier'}
              </label>
              <input
                type="text"
                placeholder={propertyType === 'vehicle' ? 'e.g. NBT-1234' : 'e.g. Unit 24B, Tower 1'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
              />
            </div>
          </div>

          {/* Valuation & Acquisition */}
          <div className="p-4 rounded-3xl bg-[#F6F7F9] space-y-4">
            <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Asset Valuation & Pricing
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Current Market Valuation (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 750000"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Purchase / Acquisition Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 850000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Fixed Commitments: Monthly Amortization & Yearly Insurance */}
          <div className="p-4 rounded-3xl bg-blue-50/60 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs uppercase font-bold text-blue-950 tracking-wider">
                Fixed Obligations (Amortization & Insurance)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-blue-950">
                  Monthly Amortization / Loan (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 16500"
                  value={monthlyAmortization}
                  onChange={(e) => setMonthlyAmortization(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-blue-950">
                  Amortization Due Day (Day of Month)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g. 15"
                  value={amortizationDueDay}
                  onChange={(e) => setAmortizationDueDay(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-blue-950">
                  Annual Insurance Cost (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 18500"
                  value={annualInsuranceAmount}
                  onChange={(e) => setAnnualInsuranceAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-blue-950">
                  Insurance Renewal Date
                </label>
                <input
                  type="date"
                  value={insuranceRenewalDate}
                  onChange={(e) => setInsuranceRenewalDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Expected Revenue Targets (Daily & Monthly) */}
          <div className="p-4 rounded-3xl bg-emerald-50/60 space-y-4">
            <h4 className="text-xs uppercase font-bold text-emerald-950 tracking-wider">
              Expected Revenue Targets
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950">
                  Expected Daily Boundary / Income (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1200 for taxi/Grab"
                  value={expectedIncomeDaily}
                  onChange={(e) => setExpectedIncomeDaily(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-950">
                  Expected Monthly Rental (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 35000 for condo"
                  value={expectedIncomeMonthly}
                  onChange={(e) => setExpectedIncomeMonthly(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Color & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Theme Color</label>
              <div className="flex items-center gap-2 pt-1">
                {THEME_OPTIONS.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => setColorTheme(theme.value)}
                    className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                      colorTheme === theme.value
                        ? 'scale-110 ring-2 ring-offset-2 ring-slate-900'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: theme.bg }}
                    title={theme.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Operational Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="active">Active & Generating Income</option>
                <option value="maintenance">Under Maintenance / Repair</option>
                <option value="inactive">Inactive / Vacant</option>
                <option value="sold">Sold / Disposed</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Notes / Reminders (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Driver: Kuya Jun (0917...), Oil change every 10k km, LTO renewal July"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bili-btn-primary py-2.5 px-6 text-xs font-semibold shadow-sm flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
