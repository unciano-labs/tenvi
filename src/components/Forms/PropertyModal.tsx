'use client';

import React, { useState, useEffect } from 'react';
import { createPropertyAction, updatePropertyAction } from '@/app/actions/properties';
import { toast } from 'sonner';
import {
  Building2,
  Car,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Property, PropertyType, PropertyStatus } from '@/types';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a property or asset name.');
      return;
    }

    setIsSubmitting(true);

    const parseNum = (val: string) => {
      const clean = val.replace(/,/g, '');
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? null : parsed;
    };

    const payload = {
      name: name.trim(),
      propertyType,
      identifier: identifier.trim() || null,
      estimatedValue: parseNum(estimatedValue) ?? 0,
      purchasePrice: parseNum(purchasePrice),
      purchaseDate: purchaseDate || null,
      monthlyAmortization: parseNum(monthlyAmortization),
      amortizationDueDay: amortizationDueDay ? parseInt(amortizationDueDay, 10) : null,
      annualInsuranceAmount: parseNum(annualInsuranceAmount),
      insuranceRenewalDate: insuranceRenewalDate || null,
      expectedIncomeDaily: parseNum(expectedIncomeDaily),
      expectedIncomeMonthly: parseNum(expectedIncomeMonthly),
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
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader className="pr-10 sm:pr-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {propertyType === 'vehicle' ? (
                <Car className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <ResponsiveDialogTitle className="truncate">
                {isEditing ? 'Edit Property / Asset' : 'Add Property or Asset'}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="truncate">
                Track revenue, boundary/rentals, amortization, and renewals
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-foreground">Property / Asset Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Toyota Vios Grab #1, BGC One Maridien Studio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Asset Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {propertyType === 'vehicle' ? 'Plate Number / VIN' : 'Unit / Identifier'}
                </label>
                <Input
                  type="text"
                  placeholder={propertyType === 'vehicle' ? 'e.g. NBT-1234' : 'e.g. Unit 24B, Tower 1'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="text-sm uppercase"
                />
              </div>
            </div>

            {/* Valuation & Acquisition */}
            <div className="p-4 rounded-3xl bg-muted/60 space-y-4">
              <h4 className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                Asset Valuation & Pricing
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Current Market Valuation (₱)
                  </label>
                  <MoneyInput
                    placeholder="e.g. 750,000"
                    value={estimatedValue}
                    onChange={(val) => setEstimatedValue(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Purchase / Acquisition Price (₱)
                  </label>
                  <MoneyInput
                    placeholder="e.g. 850,000"
                    value={purchasePrice}
                    onChange={(val) => setPurchasePrice(val)}
                  />
                </div>
              </div>
            </div>

            {/* Fixed Commitments */}
            <div className="p-4 rounded-3xl bg-primary/5 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h4 className="text-xs uppercase font-bold text-foreground tracking-wider">
                  Fixed Obligations (Amortization & Insurance)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Monthly Amortization / Loan (₱)
                  </label>
                  <MoneyInput
                    placeholder="e.g. 16,500"
                    value={monthlyAmortization}
                    onChange={(val) => setMonthlyAmortization(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Amortization Due Day (Day of Month)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="e.g. 15"
                    value={amortizationDueDay}
                    onChange={(e) => setAmortizationDueDay(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Annual Insurance Cost (₱)
                  </label>
                  <MoneyInput
                    placeholder="e.g. 18,500"
                    value={annualInsuranceAmount}
                    onChange={(val) => setAnnualInsuranceAmount(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Insurance Renewal Date
                  </label>
                  <Input
                    type="date"
                    value={insuranceRenewalDate}
                    onChange={(e) => setInsuranceRenewalDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Expected Revenue Targets */}
            <div className="p-4 rounded-3xl bg-emerald-500/10 space-y-4">
              <h4 className="text-xs uppercase font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
                Expected Revenue Targets
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Expected Daily Boundary / Income (₱)
                  </label>
                  <MoneyInput
                    placeholder="e.g. 1,200 for taxi/Grab"
                    value={expectedIncomeDaily}
                    onChange={(val) => setExpectedIncomeDaily(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Expected Monthly Rental (₱)
                  </label>
                  <MoneyInput
                    placeholder="e.g. 35,000 for condo"
                    value={expectedIncomeMonthly}
                    onChange={(val) => setExpectedIncomeMonthly(val)}
                  />
                </div>
              </div>
            </div>

            {/* Color & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Theme Color</label>
                <div className="flex items-center gap-2 pt-1">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => setColorTheme(theme.value)}
                      className={`size-8 rounded-full transition-transform cursor-pointer ${
                        colorTheme === theme.value
                          ? 'scale-110 ring-2 ring-offset-2 ring-primary'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: theme.bg }}
                      title={theme.label}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Operational Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                  className="w-full min-h-12 h-12 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
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
              <label className="text-xs font-bold text-foreground">Notes / Reminders (Optional)</label>
              <Input
                type="text"
                placeholder="e.g. Driver: Kuya Jun, Oil change every 10k km"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="soft"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Property'}
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
