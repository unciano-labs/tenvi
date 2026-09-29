'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { propertySchema } from '@/lib/validations/schemas';
import { PropertyInput } from '@/types';

export async function createPropertyAction(data: PropertyInput) {
  const supabase = await createClient();

  // 1. Authenticate user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to create a property.' };
  }

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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update a property.' };
  }

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

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  revalidatePath(`/dashboard/properties/${id}`);
  return { success: true };
}

export async function deletePropertyAction(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('bili_properties')
    .delete()
    .eq('id', id)
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting property:', error);
    return { error: 'Failed to delete property.' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/properties');
  return { success: true };
}
