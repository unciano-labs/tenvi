'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { requireWebsiteUser } from '@/lib/auth/guards';
import { UserOnboarding } from '@/types';
import { revalidatePath } from 'next/cache';

/**
 * Retrieves the onboarding record and live progress stats for the authenticated user.
 */
export async function getOnboardingStateAction(): Promise<{
  onboarding: UserOnboarding | null;
  liveStats: {
    accountCount: number;
    transactionCount: number;
    cardOrLoanCount: number;
    hasTriedAi: boolean;
  };
  error?: string;
}> {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return {
      onboarding: null,
      liveStats: { accountCount: 0, transactionCount: 0, cardOrLoanCount: 0, hasTriedAi: false },
      error: auth.error || 'Unauthorized',
    };
  }

  const supabase = await createClient();
  const userId = auth.user.id;

  // 1. Fetch onboarding record
  const { data: onboardingData } = await supabase
    .from('bili_user_onboarding')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', userId)
    .maybeSingle();

  // 2. Fetch live counts to automatically reflect completed actions
  const [
    { count: accountsCount },
    { count: txCount },
    { count: cardsCount },
    { count: loansCount },
  ] = await Promise.all([
    supabase
      .from('bili_savings')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId),
    supabase
      .from('bili_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId),
    supabase
      .from('bili_credit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId),
    supabase
      .from('bili_loans')
      .select('*', { count: 'exact', head: true })
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId),
  ]);

  const totalAccounts = accountsCount || 0;
  const totalTransactions = txCount || 0;
  const totalCardsOrLoans = (cardsCount || 0) + (loansCount || 0);

  return {
    onboarding: (onboardingData as UserOnboarding) || null,
    liveStats: {
      accountCount: totalAccounts,
      transactionCount: totalTransactions,
      cardOrLoanCount: totalCardsOrLoans,
      hasTriedAi: Boolean(onboardingData?.has_tried_ai),
    },
  };
}

/**
 * Quick-start wizard setup: saves primary money pocket and preferences,
 * then marks the modal phase as completed.
 */
export async function saveInitialSetupAction(payload: {
  accountName: string;
  institutionName: string;
  accountType: 'cash' | 'digital_bank' | 'traditional_bank' | 'ewallet';
  initialBalance: number;
  preferredModules?: string[];
  colorTheme?: string;
}): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();
  const userId = auth.user.id;

  // 1. Create or update the primary savings / float account
  const { data: existingAccount } = await supabase
    .from('bili_savings')
    .select('id')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const chosenColor = payload.colorTheme || 'indigo';

  if (existingAccount) {
    await supabase
      .from('bili_savings')
      .update({
        name: payload.accountName || 'Primary Account',
        institution_name: payload.institutionName || 'Wallet',
        account_type: payload.accountType || 'ewallet',
        current_balance: Math.max(0, Number(payload.initialBalance) || 0),
        color_theme: chosenColor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingAccount.id);
  } else {
    await supabase.from('bili_savings').insert({
      website_id: WEBSITE_ID,
      user_id: userId,
      name: payload.accountName || 'Cash on Hand',
      institution_name: payload.institutionName || 'Physical Wallet',
      account_type: payload.accountType || 'cash',
      current_balance: Math.max(0, Number(payload.initialBalance) || 0),
      color_theme: chosenColor,
      is_active: true,
    });
  }

  // 2. Mark initial onboarding step complete
  const { error: onboardErr } = await supabase.from('bili_user_onboarding').upsert(
    {
      website_id: WEBSITE_ID,
      user_id: userId,
      completed: true,
      step: 5,
      has_added_account: true,
      preferred_modules: payload.preferredModules || ['expenses', 'cards'],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'website_id,user_id' }
  );

  if (onboardErr) {
    console.error('Error saving onboarding state:', onboardErr);
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Dismisses the top Launchpad checklist widget for the user.
 */
export async function dismissOnboardingChecklistAction(): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: auth.error || 'Unauthorized' };
  }

  const supabase = await createClient();
  const userId = auth.user.id;

  const { error } = await supabase.from('bili_user_onboarding').upsert(
    {
      website_id: WEBSITE_ID,
      user_id: userId,
      dismissed_checklist: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'website_id,user_id' }
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Marks that the user tried Tenvi AI.
 */
export async function markAiTestedAction(): Promise<{ success: boolean }> {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) return { success: false };

  const supabase = await createClient();
  await supabase.from('bili_user_onboarding').upsert(
    {
      website_id: WEBSITE_ID,
      user_id: auth.user.id,
      has_tried_ai: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'website_id,user_id' }
  );

  return { success: true };
}
