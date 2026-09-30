'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WEBSITE_ID, DEFAULT_ROLE_ID, DEFAULT_CATEGORIES } from '@/lib/constants';
import { loginSchema, registerSchema } from '@/lib/validations/schemas';
import { checkUserWebsiteMembership, verifyWebsiteMembership } from '@/lib/auth/guards';

/**
 * Ensures initial default state exists for a user on this website:
 * 1. Default categories
 * 2. Default "Cash on Hand" float account in bili_savings
 * 3. Initial bili_user_onboarding record
 */
export async function seedInitialUserData(userId: string) {
  const admin = createAdminClient();

  // 1. Seed categories
  try {
    const { data: existingCats } = await admin
      .from('bili_categories')
      .select('id')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .limit(1);

    if (!existingCats || existingCats.length === 0) {
      const categoriesToInsert = DEFAULT_CATEGORIES.map((cat) => ({
        website_id: WEBSITE_ID,
        user_id: userId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        kind: cat.kind,
        is_default: true,
      }));

      await admin.from('bili_categories').insert(categoriesToInsert);
    }
  } catch (catErr) {
    console.error('Error seeding default categories:', catErr);
  }

  // 2. Seed default "Cash on Hand" float account
  try {
    const { data: existingSavings } = await admin
      .from('bili_savings')
      .select('id')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', userId)
      .limit(1);

    if (!existingSavings || existingSavings.length === 0) {
      await admin.from('bili_savings').insert({
        website_id: WEBSITE_ID,
        user_id: userId,
        name: 'Cash on Hand',
        institution_name: 'Physical Wallet',
        account_type: 'cash',
        current_balance: 0,
        color_theme: 'emerald',
        is_active: true,
      });
    }
  } catch (savErr) {
    console.error('Error seeding default savings account:', savErr);
  }

  // 3. Seed onboarding record
  try {
    await admin.from('bili_user_onboarding').upsert(
      {
        website_id: WEBSITE_ID,
        user_id: userId,
        completed: false,
        step: 1,
        dismissed_checklist: false,
        has_added_account: false,
        has_added_transaction: false,
        has_added_card_or_loan: false,
        has_tried_ai: false,
        preferred_modules: ['expenses', 'cards'],
      },
      { onConflict: 'website_id,user_id', ignoreDuplicates: true }
    );
  } catch (onboardErr) {
    console.error('Error seeding onboarding status:', onboardErr);
  }
}


/**
 * Enrolls a user into Tenvi (WEBSITE_ID) by creating user_profile if needed
 * and linking to user_roles.
 *
 * Uses a layered strategy:
 *   1. Admin client RPC (enroll_user_in_website) — primary path
 *   2. Standard (session) client RPC — fallback if admin RPC fails
 *   3. Direct table insertion via admin client — last resort
 *
 * After enrollment, verifies that the user actually has website access.
 * Throws if enrollment ultimately fails so the caller can handle it.
 */
export async function enrollUserInTenvi(userId: string, email: string, fullName: string) {
  const rpcParams = {
    p_website_id: WEBSITE_ID,
    p_user_id: userId,
    p_role_name: 'user',
    p_full_name: fullName || null,
  };

  // ── Strategy 1: Admin client RPC ──
  try {
    const admin = createAdminClient();
    const { error: rpcErr } = await admin.rpc('enroll_user_in_website', rpcParams);

    if (!rpcErr) {
      // Verify enrollment actually took effect
      const verified = await verifyWebsiteMembership(userId, WEBSITE_ID);
      if (verified) return;
      console.warn('[enrollUserInTenvi] Admin RPC returned success but membership check failed — trying fallback');
    } else {
      console.warn('[enrollUserInTenvi] Admin RPC error:', rpcErr.message, rpcErr.code);
    }
  } catch (adminRpcErr) {
    console.warn('[enrollUserInTenvi] Admin client RPC threw:', adminRpcErr);
  }

  // ── Strategy 2: Standard (session-authenticated) client RPC ──
  // The enroll_user_in_website function is SECURITY DEFINER, callable by authenticated users
  try {
    const supabase = await createClient();
    const { error: stdRpcErr } = await supabase.rpc('enroll_user_in_website', rpcParams);

    if (!stdRpcErr) {
      const verified = await verifyWebsiteMembership(userId, WEBSITE_ID);
      if (verified) return;
      console.warn('[enrollUserInTenvi] Standard RPC returned success but membership check failed — trying direct insert');
    } else {
      console.warn('[enrollUserInTenvi] Standard RPC error:', stdRpcErr.message, stdRpcErr.code);
    }
  } catch (stdRpcErr) {
    console.warn('[enrollUserInTenvi] Standard client RPC threw:', stdRpcErr);
  }

  // ── Strategy 3: Direct table insertion via admin client ──
  try {
    const admin = createAdminClient();

    let { data: profile } = await admin
      .from('user_profiles')
      .select('id, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile, error: profileErr } = await admin
        .from('user_profiles')
        .insert({
          user_id: userId,
          email: email,
          full_name: fullName || null,
        })
        .select('id, full_name')
        .single();

      if (profileErr) {
        console.error('[enrollUserInTenvi] Profile insert error:', profileErr.message, profileErr.code);
        throw new Error(`Failed to create user profile: ${profileErr.message}`);
      }
      profile = newProfile;
    }

    if (profile) {
      // If a new or edited fullName is provided, update user_profiles
      if (fullName && profile.full_name !== fullName) {
        await admin
          .from('user_profiles')
          .update({ full_name: fullName })
          .eq('id', profile.id);
      }

      const { error: roleErr } = await admin.from('user_roles').upsert(
        {
          user_profile_id: profile.id,
          website_role_id: DEFAULT_ROLE_ID,
        },
        { onConflict: 'user_profile_id,website_role_id' }
      );

      if (roleErr && roleErr.code !== '23505') {
        console.error('[enrollUserInTenvi] Role insert error:', roleErr.message, roleErr.code);
        throw new Error(`Failed to link user role: ${roleErr.message}`);
      }

      // Final verification
      const verified = await verifyWebsiteMembership(userId, WEBSITE_ID);
      if (verified) return;
    }
  } catch (directErr) {
    console.error('[enrollUserInTenvi] Direct insert strategy failed:', directErr);
    throw directErr;
  }

  throw new Error(`Enrollment failed for user ${userId}: all strategies exhausted`);
}

/**
 * LOGIN ACTION:
 * Strict isolation: Authenticate credentials -> Check website role.
 * If user has no role for this website -> SIGN OUT immediately & redirect to registration
 * with email pre-populated (readonly) and name pre-populated (editable).
 */
export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<{ error?: string; code?: string } | void> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid input' };
  }

  const supabase = await createClient();

  // 1. Authenticate identity with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || 'Incorrect email or password' };
  }

  // 2. Authorize website membership
  const isEnrolled = await checkUserWebsiteMembership(data.user.id, WEBSITE_ID);
  if (!isEnrolled) {
    // Fetch profile details for pre-populating registration
    let fullName = (data.user.user_metadata?.full_name as string) || '';
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profile?.full_name) {
          fullName = profile.full_name;
        }
      }
    } catch (profileErr) {
      console.warn('Profile fetch warning in loginAction:', profileErr);
    }

    // Revoke the active session — user cannot access Tenvi dashboard yet
    await supabase.auth.signOut();

    // Redirect to registration with pre-populated email (readonly) and name (editable)
    const params = new URLSearchParams({
      email,
      ...(fullName ? { name: fullName } : {}),
      enrolling: 'true',
    });

    redirect(`/register?${params.toString()}`);
  }

  // Ensure default categories, cash account, and onboarding are seeded
  await seedInitialUserData(data.user.id);

  redirect('/dashboard');
}

/**
 * REGISTER ACTION:
 * Handles brand new user registration AND multi-site enrollment for existing users.
 */
export async function registerAction(prevState: any, formData: FormData) {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  const parsed = registerSchema.safeParse({ fullName, email, password });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid input' };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (adminErr) {
    console.error('[registerAction] Failed to create admin client:', adminErr);
    return { error: 'Server configuration error. Please try again later.' };
  }
  const supabase = await createClient();

  // 1. Check if email already exists globally in user_profiles
  const { data: existingProfile } = await admin
    .from('user_profiles')
    .select('id, user_id, full_name')
    .eq('email', email)
    .maybeSingle();

  // 1b. Also check if user exists in auth.users but not in user_profiles
  // (this can happen when a previous signup created the auth.users entry
  //  but enrollment failed before the user_profiles row was created)
  let authUserId: string | null = null;
  if (!existingProfile) {
    try {
      const { data: authUserList } = await admin.auth.admin.listUsers();
      const matchedUser = authUserList?.users?.find(
        (u: { email?: string }) => u.email?.toLowerCase() === email
      );
      if (matchedUser) {
        authUserId = matchedUser.id;
      }
    } catch {
      // listUsers may fail in some configurations; fall through to signUp
    }
  }

  if (existingProfile) {
    // 2. Check if already enrolled in Tenvi
    const isEnrolled = await checkUserWebsiteMembership(existingProfile.user_id, WEBSITE_ID);
    if (isEnrolled) {
      return {
        error: 'You already have a Tenvi account with this email. Please log in instead.',
        code: 'ALREADY_REGISTERED',
      };
    }

    // 3. User exists on another site! Verify password before enrolling into Tenvi
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr || !authData.user) {
      return {
        error:
          'Incorrect password for this account. Please enter your correct account password to activate Tenvi.',
        code: 'EXISTING_ACCOUNT_PASSWORD_REQUIRED',
      };
    }

    // 4. Enroll existing user in Tenvi
    try {
      await enrollUserInTenvi(
        authData.user.id,
        email,
        fullName || existingProfile.full_name || ''
      );
      await seedInitialUserData(authData.user.id);
    } catch (enrollErr) {
      console.error('[registerAction] Enrollment failed for existing cross-site user:', enrollErr);
      return {
        error: 'Account activation failed. Please try again or contact support.',
      };
    }

    redirect('/dashboard');
  }

  // 5. Handle edge case: user exists in auth.users but NOT in user_profiles
  // (orphaned auth entry from a previous failed registration)
  if (authUserId) {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr || !authData.user) {
      return {
        error:
          'Incorrect password for this account. Please enter your correct account password to activate Tenvi.',
        code: 'EXISTING_ACCOUNT_PASSWORD_REQUIRED',
      };
    }

    try {
      await enrollUserInTenvi(authData.user.id, email, fullName);
      await seedInitialUserData(authData.user.id);
    } catch (enrollErr) {
      console.error('[registerAction] Enrollment failed for orphaned auth user:', enrollErr);
      return {
        error: 'Account setup failed. Please try again or contact support.',
      };
    }

    redirect('/dashboard');
  }

  // 6. Brand New User: Sign up with Supabase Auth
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (signUpErr) {
    // Edge case: User exists in auth.users but not user_profiles
    if (signUpErr.message?.toLowerCase().includes('already registered')) {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr || !authData.user) {
        return {
          error:
            'Incorrect password for this account. Please enter your correct account password to activate Tenvi.',
          code: 'EXISTING_ACCOUNT_PASSWORD_REQUIRED',
        };
      }

      try {
        await enrollUserInTenvi(authData.user.id, email, fullName);
        await seedInitialUserData(authData.user.id);
      } catch (enrollErr) {
        console.error('[registerAction] Enrollment failed for "already registered" edge case:', enrollErr);
        return {
          error: 'Account activation failed. Please try again or contact support.',
        };
      }

      redirect('/dashboard');
    }

    return { error: signUpErr.message };
  }

  // 7. Verify signUp returned a valid user
  // Supabase can return user=null or user with empty identities[] in some configs
  if (!signUpData.user) {
    console.error('[registerAction] signUp succeeded but returned null user');
    return {
      error: 'Account creation failed. Please try again.',
    };
  }

  // Check for "fake signup" response (identities is empty when user already exists
  // and Supabase is configured with email confirmation + privacy protection)
  const identities = signUpData.user.identities;
  if (identities && identities.length === 0) {
    // This means the email already exists — ask for password
    return {
      error:
        'Incorrect password for this account. Please enter your correct account password to activate Tenvi.',
      code: 'EXISTING_ACCOUNT_PASSWORD_REQUIRED',
    };
  }

  // 8. Enroll the brand new user
  try {
    await enrollUserInTenvi(signUpData.user.id, email, fullName);
    await seedInitialUserData(signUpData.user.id);
  } catch (enrollErr) {
    console.error('[registerAction] Enrollment failed for brand new user:', enrollErr);
    // Don't leave the user in limbo — try to sign them out to prevent
    // a redirect loop with the dashboard layout guard
    try { await supabase.auth.signOut(); } catch {}
    return {
      error: 'Account was created but setup failed. Please try registering again.',
    };
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
