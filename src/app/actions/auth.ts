'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WEBSITE_ID, DEFAULT_ROLE_ID, DEFAULT_CATEGORIES } from '@/lib/constants';
import { loginSchema, registerSchema } from '@/lib/validations/schemas';
import { checkUserWebsiteMembership } from '@/lib/auth/guards';

/**
 * Ensures default categories exist for a user on this website.
 */
async function seedDefaultCategories(userId: string) {
  const admin = createAdminClient();

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

    const { error: catErr } = await admin
      .from('bili_categories')
      .insert(categoriesToInsert);

    if (catErr) {
      console.error('Error seeding default categories:', catErr);
    }
  }
}

/**
 * Enrolls a user into Tenvi (WEBSITE_ID) by creating user_profile if needed
 * and linking to user_roles.
 */
async function enrollUserInTenvi(userId: string, email: string, fullName: string) {
  const admin = createAdminClient();

  // Try RPC function first
  const { error: rpcErr } = await admin.rpc('enroll_user_in_website', {
    p_website_id: WEBSITE_ID,
    p_user_id: userId,
    p_role_name: 'user',
    p_full_name: fullName || null,
  });

  if (!rpcErr) return;

  // Fallback to direct insertion if RPC fails
  console.warn('Fallback to direct enrollment insertion:', rpcErr);

  let { data: profile } = await admin
    .from('user_profiles')
    .select('id')
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
      .select('id')
      .single();

    if (profileErr) {
      console.error('Error creating user profile:', profileErr);
    } else {
      profile = newProfile;
    }
  }

  if (profile) {
    const { error: roleErr } = await admin.from('user_roles').upsert(
      {
        user_profile_id: profile.id,
        website_role_id: DEFAULT_ROLE_ID,
      },
      { onConflict: 'user_profile_id,website_role_id' }
    );

    if (roleErr && roleErr.code !== '23505') {
      console.error('Error linking user role:', roleErr);
    }
  }
}

/**
 * LOGIN ACTION:
 * Strict isolation: Authenticate credentials -> Check website role.
 * If user has no role for this website -> SIGN OUT immediately & return actionable error.
 */
export async function loginAction(prevState: any, formData: FormData) {
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
    // Revoke the session immediately — user is not authorized for Tenvi
    await supabase.auth.signOut();
    return {
      error:
        'No Tenvi account found for this email. If you have an account on another connected website, please register on Tenvi to activate access.',
      code: 'NOT_ENROLLED_FOR_WEBSITE',
    };
  }

  // Ensure default categories are seeded
  await seedDefaultCategories(data.user.id);

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

  const admin = createAdminClient();
  const supabase = await createClient();

  // 1. Check if email already exists globally in user_profiles
  const { data: existingProfile } = await admin
    .from('user_profiles')
    .select('id, user_id, full_name')
    .eq('email', email)
    .maybeSingle();

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
          'An account with this email exists on our network. Please enter your existing account password to add Tenvi to your account.',
        code: 'EXISTING_ACCOUNT_PASSWORD_REQUIRED',
      };
    }

    // 4. Enroll existing user in Tenvi
    await enrollUserInTenvi(
      authData.user.id,
      email,
      fullName || existingProfile.full_name || ''
    );

    await seedDefaultCategories(authData.user.id);
    redirect('/dashboard');
  }

  // 5. Brand New User: Sign up with Supabase Auth
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
            'An account with this email exists on our network. Please enter your existing account password to add Tenvi to your account.',
          code: 'EXISTING_ACCOUNT_PASSWORD_REQUIRED',
        };
      }

      await enrollUserInTenvi(authData.user.id, email, fullName);
      await seedDefaultCategories(authData.user.id);
      redirect('/dashboard');
    }

    return { error: signUpErr.message };
  }

  if (signUpData.user) {
    await enrollUserInTenvi(signUpData.user.id, email, fullName);
    await seedDefaultCategories(signUpData.user.id);
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
