'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { propertySchema } from '@/lib/validations/schemas';
import { PropertyInput } from '@/types';
import { logAuditEntry } from '@/lib/audit/logger';
import { syncPropertyLoanAmortization } from '@/lib/finance/calculations';

export async function createPropertyAction(data: PropertyInput) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'You must be logged in to create a property.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  // 2. Validate inputs with Zod
  const parsed = propertySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid property details' };
  }

  const {
    name,
    propertyType,
    identifier,
    estimatedValue,
    purchasePrice,
    purchaseDate,
    monthlyAmortization,
    amortizationDueDay,
    annualInsuranceAmount,
    insuranceRenewalDate,
    expectedIncomeDaily,
    expectedIncomeMonthly,
    colorTheme,
    status,
    notes,
  } = parsed.data;

  // 3. Scoped database write
  const { data: newProperty, error } = await supabase
    .from('bili_properties')
    .insert({
      website_id: WEBSITE_ID,
      user_id: user.id,
      name,
      property_type: propertyType,
      identifier: identifier || null,
      estimated_value: estimatedValue,
      purchase_price: purchasePrice || 0,
      purchase_date: purchaseDate || null,
      monthly_amortization: monthlyAmortization || 0,
      amortization_due_day: amortizationDueDay || null,
      annual_insurance_amount: annualInsuranceAmount || 0,
      insurance_renewal_date: insuranceRenewalDate || null,
      expected_income_daily: expectedIncomeDaily || 0,
      expected_income_monthly: expectedIncomeMonthly || 0,
      color_theme: colorTheme || 'indigo',
      status: status || 'active',
      notes: notes || null,
    })
    .select('id')
    .single();

  if (error || !newProperty) {
    console.error('Error creating property:', error);
    return { error: 'Failed to create property. Please try again.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  return { success: true, id: newProperty.id };
}

export async function updatePropertyAction(id: string, data: PropertyInput) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'You must be logged in to update a property.' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const parsed = propertySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid property details' };
  }

  const {
    name,
    propertyType,
    identifier,
    estimatedValue,
    purchasePrice,
    purchaseDate,
    monthlyAmortization,
    amortizationDueDay,
    annualInsuranceAmount,
    insuranceRenewalDate,
    expectedIncomeDaily,
    expectedIncomeMonthly,
    colorTheme,
    status,
    notes,
  } = parsed.data;

  const { error } = await supabase
    .from('bili_properties')
    .update({
      name,
      property_type: propertyType,
      identifier: identifier || null,
      estimated_value: estimatedValue,
      purchase_price: purchasePrice || 0,
      purchase_date: purchaseDate || null,
      monthly_amortization: monthlyAmortization || 0,
      amortization_due_day: amortizationDueDay || null,
      annual_insurance_amount: annualInsuranceAmount || 0,
      insurance_renewal_date: insuranceRenewalDate || null,
      expected_income_daily: expectedIncomeDaily || 0,
      expected_income_monthly: expectedIncomeMonthly || 0,
      color_theme: colorTheme,
      status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating property:', error);
    return { error: 'Failed to update property.' };
  }

  if (!monthlyAmortization || monthlyAmortization === 0) {
    await syncPropertyLoanAmortization(supabase, id);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  revalidatePath(`/dashboard/properties/${id}`);
  return { success: true };
}

export async function deletePropertyAction(id: string) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  // 1. Fetch current property for audit logging
  const { data: prop } = await supabase
    .from('bili_properties')
    .select('*')
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  // 2. Soft delete
  const { error } = await supabase
    .from('bili_properties')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error soft-deleting property:', error);
    return { error: 'Failed to delete property.' };
  }

  // 3. Log Audit
  await logAuditEntry({
    userId: user.id,
    action: 'SOFT_DELETE',
    entityType: 'property',
    entityId: id,
    oldData: prop,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  return { success: true };
}

export async function recordPropertyValuationAction(data: {
  propertyId: string;
  valuationAmount: number;
  valuationDate?: string;
  valuationSource?: 'manual' | 'appraisal' | 'depreciation_engine';
  notes?: string;
}) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  const user = auth.user;
  const supabase = await createClient();

  const amount = Number(data.valuationAmount);
  if (isNaN(amount) || amount < 0) {
    return { error: 'Valuation amount must be a positive number.' };
  }

  const valuationDate = data.valuationDate || new Date().toISOString().split('T')[0];

  // 1. Insert historical valuation entry
  const { error: valErr } = await supabase.from('bili_asset_valuations').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    property_id: data.propertyId,
    valuation_date: valuationDate,
    valuation_amount: amount,
    valuation_source: data.valuationSource || 'manual',
    notes: data.notes || null,
  });

  if (valErr) {
    console.error('Error logging asset valuation:', valErr);
    return { error: 'Failed to record asset valuation history.' };
  }

  // 2. Update current estimated_value on property
  const { error: updateErr } = await supabase
    .from('bili_properties')
    .update({
      estimated_value: amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.propertyId)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (updateErr) {
    console.error('Error updating estimated_value:', updateErr);
  }

  // 3. Audit log
  await logAuditEntry({
    userId: user.id,
    action: 'UPDATE',
    entityType: 'property',
    entityId: data.propertyId,
    newData: { estimated_value: amount, valuation_date: valuationDate },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  revalidatePath(`/dashboard/properties/${data.propertyId}`);
  return { success: true };
}

