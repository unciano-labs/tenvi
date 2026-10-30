# Multi-Website Authentication & Authorization Architecture Specification

> **Scope**: Standardized specification and implementation blueprint for shared-database multi-website authentication across independent web applications (`Tenvi`, `Invoicer`, `Orgy`, `Parmasi`, `Denti`, etc.) using Supabase Auth and multi-tenant Role-Based Access Control (RBAC).  
> **Status**: Implemented, Cloud-Hardened & Verified in Tenvi  
> **Version**: 2.2 (Google OAuth 2.0 & Cross-Enrollment Architecture)  
> **Target Audience**: AI Agents, Backend/Full-Stack Engineers, DevOps

---

## 1. Executive Summary & Problem Definition

In our multi-tenant architecture, multiple distinct web applications share a single Supabase PostgreSQL database. While identity credentials (`auth.users`) and user profile data (`public.user_profiles`) are centralized, **authorization, roles, and domain data are strictly isolated per website (`public.websites`)**.

### 1.1 The Core Dilemma in Shared-Database Auth
Because `auth.users` is global to the entire Supabase project:
1. **Accidental Cross-Site Access**: When a user registers on **Website 1** (`Orgy` or `Invoicer`), their credentials exist globally in `auth.users`. If **Website 2** (`Tenvi`) naively verifies credentials using standard `supabase.auth.signInWithPassword()`, authentication succeeds at the identity layer. If Website 2 does not verify website-specific authorization, **User 1 gains access to Website 2 without ever registering for it.**
2. **Registration Deadlock**: If User 1 then visits Website 2's registration page (`/register`), standard `supabase.auth.signUp()` throws `"User already registered"`, blocking the user from joining Website 2.
3. **Flawed Auto-Role Provisioning**: Naive login actions that auto-create a user role or seed tenant data upon successful password verification violate tenant boundaries and allow any user in the database to enter any connected website.

### 1.2 Mandatory Business Rules
1. **Strict Website Login Isolation with Seamless Redirection**:  
   If User 1 registered on Website 1, they **can only log in directly to Website 1**. If they attempt to log into Website 2 (`Tenvi`) with valid network credentials:
   - Their identity is confirmed at the auth layer.
   - Any active session on Website 2 is immediately revoked (`signOut()`).
   - The user is automatically redirected to `/register?email=...&name=...&enrolling=true`.
2. **Pre-Populated Cross-Website Enrollment UX**:  
   When redirected to `/register`:
   - **Email**: Pre-populated and **`readOnly`** with a `"Linked Account"` badge (cannot be modified).
   - **Full Name**: Pre-populated from their network profile, but remains **editable** (if changed, the new name updates `user_profiles.full_name`).
   - **Password**: Kept **empty**. The user must confirm their existing platform password before website enrollment is granted.
   - **Unconnected Visitors**: Direct visits or failed credentials leave all registration fields **completely empty**.
3. **No Automatic Role Assignment on Login**:  
   Logging in must **never** create `user_roles` or auto-enroll a user into a website. Only explicit registration/enrollment with credential verification may grant website membership.
4. **Cloud-Resilient Defense in Depth**:  
   Website membership must be validated at every layer without depending solely on elevated service role keys:
   - **Database (RLS & Stored Functions)**: Central `SECURITY DEFINER` functions `has_website_access()` and `enroll_user_in_website()`. Granted to `authenticated`, `anon`, and `service_role`.
   - **Standard Client RPC First**: Membership checks execute via `createClient()` (anon key) first. Even if `SUPABASE_SERVICE_ROLE_KEY` is not present in cloud environments like Vercel, the check succeeds reliably.
   - **UUID Sanitization**: Environment variables (`WEBSITE_ID`, `DEFAULT_ROLE_ID`) are automatically stripped of surrounding quotes (`"` or `'`) and whitespace to eliminate PostgreSQL `22P02 invalid input syntax for type uuid` errors.
   - **Layout Guard**: Authoritative Server Component gate in `dashboard/layout.tsx`.
   - **Server Actions**: `requireWebsiteUser()` verifying identity + website membership before running mutations.

---

## 2. Multi-Website Relational Data Model

```mermaid
erDiagram
    "auth.users" ||--|| "public.user_profiles" : "1:1 user_id"
    "public.user_profiles" ||--o{ "public.user_roles" : "has roles"
    "public.website_roles" ||--o{ "public.user_roles" : "assigned to"
    "public.websites" ||--o{ "public.website_roles" : "defines roles"
    "public.websites" ||--o{ "public.bili_*" : "scopes data (website_id)"

    "auth.users" {
        uuid id PK "Supabase auth UUID"
        text email "User email address"
        text encrypted_password "Hashed credentials"
        timestamptz email_confirmed_at
    }

    "public.user_profiles" {
        uuid id PK
        uuid user_id FK "References auth.users(id) ON DELETE CASCADE"
        text email
        text full_name
        text avatar_url
    }

    "public.websites" {
        uuid id PK "Website UUID"
        text name "Tenvi, Invoicer, Orgy, Parmasi, etc."
        text subdomain
        text status
    }

    "public.website_roles" {
        uuid id PK
        uuid website_id FK "References public.websites(id) ON DELETE CASCADE"
        text role "user, admin, organizer, etc."
    }

    "public.user_roles" {
        uuid id PK
        uuid user_profile_id FK "References public.user_profiles(id) ON DELETE CASCADE"
        uuid website_role_id FK "References public.website_roles(id) ON DELETE CASCADE"
    }
```

### 2.1 Registered Websites in Shared Database
| Website Name | Website ID (`WEBSITE_ID`) | Default User Role ID (`DEFAULT_ROLE_ID`) | Primary Domain / Purpose |
|---|---|---|---|
| **Tenvi** (formerly Bili) | `65d4f86e-1829-417a-981f-bc7aad7bc953` | `02bf8818-b503-4f94-beac-6c45aa12e368` | Personal Wealth & Float Ledger |
| **Invoicer** | `e602fc2e-7b59-4ce2-a409-ef72f5955ff2` | `bb2e25be-9979-429a-a059-d15436165620` | Invoicing & Client Management |
| **Orgy** | `e4a3b8d1-7c9f-42e5-a6b1-0f8d9c2e3b4a` | `22222222-2222-2222-2222-222222222222` | Tour & Travel Operations |
| **Parmasi** | `552b43bd-0312-4de1-89de-a6bc77738717` | `eeadcb63-0c03-4dce-a83f-2d212465890a` | Pharmacy & Facility Admin |
| **Denti** | `789abe58-74bf-4caa-86ce-615e8ce216e1` | `66e9928c-007b-49e6-8b82-7514f6410e1c` | Dental Clinic Operations |

---

## 3. End-to-End Architectural Flows

### 3.1 Website-Specific Login Flow (`loginAction`)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant ServerAction as loginAction (Tenvi)
    participant SupabaseAuth as Supabase auth.users
    participant DB as Postgres (has_website_access)

    User->>Browser: Enters email + password on Tenvi /login
    Browser->>ServerAction: Submits credentials
    ServerAction->>SupabaseAuth: signInWithPassword(email, password)
    
    alt Credentials Invalid
        SupabaseAuth-->>ServerAction: Auth Error
        ServerAction-->>Browser: Return "Incorrect email or password" (stays on /login)
    else Credentials Valid in auth.users
        SupabaseAuth-->>ServerAction: User Session (auth.uid)
        ServerAction->>DB: has_website_access(WEBSITE_ID, auth.uid) via createClient()
        
        alt User Has Active Role for Tenvi
            DB-->>ServerAction: true
            ServerAction-->>Browser: Set Session Cookie & Redirect /dashboard
        else User Has NO Role for Tenvi (Enrolled on another site)
            DB-->>ServerAction: false
            ServerAction->>DB: Fetch user_profiles.full_name
            ServerAction->>SupabaseAuth: signOut() (Revoke session immediately)
            ServerAction-->>Browser: redirect(/register?email=...&name=...&enrolling=true)
        end
    end
```

### 3.2 Pre-Populated Registration & Cross-Site Enrollment Flow (`registerAction`)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant ServerAction as registerAction (Tenvi)
    participant SupabaseAuth as Supabase Auth Client
    participant DB as Postgres (enroll_user_in_website)

    Note over Browser: If redirected: Email is readOnly, Name is editable, Password is empty.<br/>If direct visit: All fields are empty.
    User->>Browser: Submits form (fullName, email, password)
    Browser->>ServerAction: Submits registration form
    ServerAction->>DB: Query user_profiles WHERE email = email
    
    alt Scenario 1: Brand New User (Email does not exist globally)
        ServerAction->>SupabaseAuth: signUp(email, password, full_name)
        SupabaseAuth-->>ServerAction: New User Created (auth.uid)
        ServerAction->>DB: enroll_user_in_website(WEBSITE_ID, auth.uid, 'user', fullName)
        ServerAction->>DB: Seed Tenvi initial categories & settings
        ServerAction-->>Browser: Redirect to /dashboard
    else Scenario 2: Existing User from Another Website
        ServerAction->>DB: Check has_website_access(WEBSITE_ID, user_id)
        alt User Already Enrolled in Tenvi
            DB-->>ServerAction: true
            ServerAction-->>Browser: Return "You already have an account. Please log in." (code: ALREADY_REGISTERED)
        else User Exists Globally BUT NOT Enrolled in Tenvi
            DB-->>ServerAction: false
            ServerAction->>SupabaseAuth: signInWithPassword(email, password) (Verify Password)
            alt Password Incorrect
                SupabaseAuth-->>ServerAction: Auth Error
                ServerAction-->>Browser: Return "Incorrect password for this account. Please enter your correct account password to activate Tenvi."
            else Password Correct
                ServerAction->>DB: enroll_user_in_website(WEBSITE_ID, auth.uid, 'user', fullName)
                ServerAction->>DB: Update user_profiles.full_name if user edited it
                ServerAction->>DB: Seed Tenvi default categories
                ServerAction-->>Browser: Set Session Cookie & Redirect to /dashboard
            end
        end
    end
```

---

## 4. Cloud Resilience & Infrastructure Hardening (Vercel / Production)

Deploying a multi-tenant shared-database architecture across cloud providers like Vercel introduced key edge cases that have been resolved and codified:

### 4.1 Anonymous RPC First (`SECURITY DEFINER`)
- **Problem**: In cloud environments, `SUPABASE_SERVICE_ROLE_KEY` is often omitted in frontend preview branches or misconfigured, causing `createAdminClient()` to throw uncaught runtime exceptions during membership checks.
- **Solution**: `public.has_website_access` is defined as `SECURITY DEFINER` and granted to `anon` and `authenticated`. `checkUserWebsiteMembership()` executes through `createClient()` (anon key) first. It only falls back to `createAdminClient()` if available, wrapped safely in a `try/catch`.

### 4.2 UUID Sanitization (`sanitizeUuid`)
- **Problem**: Copying and pasting UUIDs into Vercel dashboard environment variables frequently introduces wrapping quotes (`"65d4f86e-..."` or `'65d4f86e-...'`) or trailing whitespace. When passed to PostgreSQL typed parameters (`p_website_id uuid`), Postgres rejects the request with code `22P02: invalid input syntax for type uuid`.
- **Solution**: [src/lib/constants.ts](file:///Users/jeunciano/Workstation/Bili/src/lib/constants.ts) runs `sanitizeUuid()` on both `WEBSITE_ID` and `DEFAULT_ROLE_ID`. Any quotes or trailing spaces are stripped, and a strict UUID regex validates the string. If invalid, it automatically falls back to canonical defaults (`65d4f86e-1829-417a-981f-bc7aad7bc953`).

### 4.3 Dynamic Serverless Config Resolution
- **Problem**: When environment variables are read at module scope outside functions in `server.ts`, serverless function containers may capture empty strings during build/cold start.
- **Solution**: [src/lib/supabase/server.ts](file:///Users/jeunciano/Workstation/Bili/src/lib/supabase/server.ts) uses `getSupabaseServerConfig()` called dynamically inside each function invocation.

---

## 5. Universal Implementation Blueprint for Other Projects

Any developer or AI agent implementing this multi-tenant auth architecture on another project (`Invoicer`, `Orgy`, `Parmasi`, `Denti`, etc.) should follow these standardized steps:

### Step 1: Environment & Constants Configuration
In the target project's `src/lib/constants.ts`, define and sanitize the target website's constants:
```typescript
export const TARGET_WEBSITE_ID = 'e602fc2e-7b59-4ce2-a409-ef72f5955ff2';
export const TARGET_DEFAULT_ROLE_ID = 'bb2e25be-9979-429a-a059-d15436165620';

function sanitizeUuid(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/^["']|["']$/g, '').trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(cleaned) ? cleaned : fallback;
}

export const WEBSITE_ID = sanitizeUuid(
  process.env.NEXT_PUBLIC_WEBSITE_ID || process.env.WEBSITE_ID,
  TARGET_WEBSITE_ID
);

export const DEFAULT_ROLE_ID = sanitizeUuid(
  process.env.NEXT_PUBLIC_DEFAULT_ROLE_ID || process.env.DEFAULT_ROLE_ID,
  TARGET_DEFAULT_ROLE_ID
);

export const APP_NAME = 'Invoicer'; // or Orgy, Parmasi, etc.
```

### Step 2: Auth Guards Helper (`src/lib/auth/guards.ts`)
Copy the cloud-hardened `checkUserWebsiteMembership` and `requireWebsiteUser` functions from [src/lib/auth/guards.ts](file:///Users/jeunciano/Workstation/Bili/src/lib/auth/guards.ts). Ensure:
- It calls `supabase.rpc('has_website_access')` via standard client first.
- Admin client calls are wrapped in `try/catch`.

### Step 3: Implement `loginAction` with Auto-Redirect
In `src/app/actions/auth.ts`:
```typescript
export async function loginAction(prevState: any, formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: error?.message || 'Incorrect email or password' };
  }

  const isEnrolled = await checkUserWebsiteMembership(data.user.id, WEBSITE_ID);
  if (!isEnrolled) {
    let fullName = (data.user.user_metadata?.full_name as string) || '';
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (profile?.full_name) fullName = profile.full_name;
      }
    } catch {
      // Safe fallback
    }

    await supabase.auth.signOut();
    const params = new URLSearchParams({
      email,
      ...(fullName ? { name: fullName } : {}),
      enrolling: 'true',
    });
    redirect(`/register?${params.toString()}`);
  }

  redirect('/dashboard');
}
```

### Step 4: Implement `registerAction` with Cross-Site Enrollment
In `src/app/actions/auth.ts`:
```typescript
export async function registerAction(prevState: any, formData: FormData) {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: existingProfile } = await admin
    .from('user_profiles')
    .select('id, user_id, full_name')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    const isEnrolled = await checkUserWebsiteMembership(existingProfile.user_id, WEBSITE_ID);
    if (isEnrolled) {
      return { error: 'You already have an account. Please log in instead.', code: 'ALREADY_REGISTERED' };
    }

    // Verify existing password
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr || !authData.user) {
      return {
        error: 'Incorrect password for this account. Please enter your correct account password to activate access.',
        code: 'EXISTING_ACCOUNT_PASSWORD_REQUIRED',
      };
    }

    // Enroll into target website
    await enrollUserInWebsite(authData.user.id, email, fullName || existingProfile.full_name || '');
    redirect('/dashboard');
  }

  // Brand new user sign-up
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (signUpErr) return { error: signUpErr.message };

  if (signUpData.user) {
    await enrollUserInWebsite(signUpData.user.id, email, fullName);
  }
  redirect('/dashboard');
}
```

### Step 5: Guard Layout (`src/app/dashboard/layout.tsx`)
In the protected dashboard layout, verify membership immediately after confirming identity:
```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkUserWebsiteMembership } from '@/lib/auth/guards';
import { WEBSITE_ID } from '@/lib/constants';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Authoritative authorization gate
  const isEnrolled = await checkUserWebsiteMembership(user.id, WEBSITE_ID);
  if (!isEnrolled) {
    const userEmail = user.email || '';
    const userName = (user.user_metadata?.full_name as string) || '';

    // Revoke foreign session and redirect to registration with pre-populated details
    await supabase.auth.signOut();
    const params = new URLSearchParams({
      email: userEmail,
      ...(userName ? { name: userName } : {}),
      enrolling: 'true',
    });
    redirect(`/register?${params.toString()}`);
  }

  return <>{children}</>;
}
```

### Step 6: Registration UI Component (`src/app/(auth)/register/page.tsx`)
The registration UI must handle pre-populated query parameters gracefully:
```tsx
'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { registerAction } from '@/app/actions/auth';
import { Lock, Mail, User, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export default function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const searchParams = useSearchParams();

  const urlEmail = searchParams.get('email')?.trim() || '';
  const urlName = searchParams.get('name')?.trim() || '';
  const isEnrolling = searchParams.get('enrolling') === 'true' || Boolean(urlEmail);

  return (
    <form action={formAction} className="space-y-5">
      {/* Alert Banner: Connected Account Detected */}
      {isEnrolling && !state?.error && (
        <div className="p-4 rounded-2xl bg-blue-50 text-blue-900 border border-blue-200 text-sm">
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            Connected Account Detected
          </div>
          <p className="text-xs text-blue-800">
            Your credentials belong to an account on our platform. Please confirm your account
            password below to link and activate access.
          </p>
        </div>
      )}

      {/* Full Name: Pre-populated & Editable */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase">Your Full Name</label>
        <input
          name="fullName"
          type="text"
          required
          defaultValue={urlName}
          className="w-full border rounded-xl px-4 py-3"
        />
        {isEnrolling && (
          <p className="text-[11px] text-slate-400 mt-1">
            Pre-filled from your profile. You can edit this name.
          </p>
        )}
      </div>

      {/* Email: Pre-populated & ReadOnly (NOT disabled, so FormData includes it) */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase">Email Address</label>
        <input
          name="email"
          type="email"
          required
          readOnly={isEnrolling}
          defaultValue={urlEmail}
          className={`w-full border rounded-xl px-4 py-3 ${
            isEnrolling ? 'bg-slate-100 text-slate-600 cursor-not-allowed select-none' : ''
          }`}
        />
        {isEnrolling && (
          <p className="text-[11px] text-slate-400 mt-1">
            Locked to your verified platform account email.
          </p>
        )}
      </div>

      {/* Password: Always empty. Dynamic label */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase">
          {isEnrolling ? 'Confirm Account Password' : 'Password'}
        </label>
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full border rounded-xl px-4 py-3"
        />
      </div>

      <button type="submit" disabled={isPending} className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl">
        {isPending ? 'Processing...' : isEnrolling ? 'Link Account & Join' : 'Create Account'}
      </button>
    </form>
  );
}
```
> [!CRITICAL]
> **Use `readOnly` instead of `disabled` for pre-populated inputs**. In HTML specification, form inputs marked as `disabled` are omitted from the form submission payload (`FormData`), causing `formData.get('email')` to return `null` on the server!

### Step 7: Guard Server Actions
Add `const auth = await requireWebsiteUser();` at the beginning of mutating Server Actions:
```typescript
export async function createTransactionAction(data: TransactionInput) {
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Unauthorized' };
  }
  
  // Proceed with safe mutation scoped to auth.user.id and WEBSITE_ID
}
```

---

## 6. Security & Operational FAQ

### Q1: What happens if a user changes their password?
Because `auth.users` holds credentials globally, changing the password updates the password for all enrolled websites. However, authorization (whether they can access Website A, Website B, or Website C) remains strictly governed by `user_roles`.

### Q2: What happens if a user is removed or deleted from one website?
Deleting a user from **Website 1** deletes only their `user_roles` row for Website 1 (and cascades domain tables linked by `website_id`). Their global account in `auth.users` and their membership in **Website 2** remain completely untouched.

### Q3: How are session cookies isolated if websites run on different domains?
- **Distinct Domains** (`tenvi.app` vs `invoicer.app`): Standard browser cookie jar partitioning guarantees sessions never leak across distinct domain names.
- **Shared Subdomains** (`tenvi.domain.com` vs `invoicer.domain.com`): Configure `@supabase/ssr` cookies without a wildcard `Domain=.domain.com` attribute so cookies are host-only.

### Q4: Why does `checkUserWebsiteMembership` check via the standard client first instead of admin client?
`public.has_website_access` is a PostgreSQL `SECURITY DEFINER` function explicitly granted to `anon` and `authenticated`. Executing it via `createClient()` (anon key) means authorization checks work reliably in preview deployments, local staging, and production environments where `SUPABASE_SERVICE_ROLE_KEY` might not be provided or needed.

### Q5: What causes "invalid input syntax for type uuid" errors on Vercel?
Copying and pasting UUIDs into cloud platform dashboards often introduces wrapping quotes (e.g. `"65d4f86e-..."`) or trailing newlines. When passed as a query parameter into PostgreSQL, PostgreSQL cannot cast a quoted string into a native `UUID`. Our `sanitizeUuid()` utility strips quotes and whitespace automatically.

---

## 7. Google OAuth 2.0 Integration & Cross-Website Auto-Enrollment

Google OAuth 2.0 provides a modern, 1-click authentication pathway for both sign-in and registration while strictly preserving the platform's multi-tenant relational authorization boundaries.

### 7.1 Architecture & Identity Provider (IdP) Trust Model

Supabase Auth acts as the OAuth 2.0 Client delegating identity verification to Google Identity Services:

1. **Initiation**: The client invokes `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl } })` using the PKCE flow.
2. **Provider Verification**: Google prompts the user to select their Google account, authenticate, and grant profile consent.
3. **Supabase Ingestion**: Google redirects back to the central Supabase Auth service callback (`https://xhjkkrjnlorrayuaxbra.supabase.co/auth/v1/callback`). Supabase creates or looks up the global user record in `auth.users` and attaches Google user identities.
4. **App Callback Hand-off**: Supabase forwards the browser back to Tenvi's Route Handler at `/auth/callback?code=...`.
5. **Session & Tenant Provisioning**: Tenvi exchanges the authorization code for an active session, checks website authorization via `checkUserWebsiteMembership(user.id, WEBSITE_ID)`, and provisions roles and initial tenant assets if not yet enrolled.

### 7.2 The Cross-Website Auto-Enrollment Mechanic: Password vs. OAuth

A central challenge in a shared-database multi-website ecosystem is preventing impersonation across sites:

| Authentication Method | Email Ownership Proof | Enrollment Policy | Rationale |
|---|---|---|---|
| **Email + Password** | ❌ None (anyone can type an email) | **Password Confirmation Required** | If User A registered on *Invoicer*, a third party visiting *Tenvi* cannot simply type User A's email to get access. The user is redirected to `/register?email=...&enrolling=true` and must supply the account's existing password to verify ownership. |
| **Google OAuth 2.0** | ✅ **Cryptographic & Immediate** | **Direct Auto-Enrollment** | Google has already authenticated the physical user and proven absolute ownership of the email address (`email_verified = true`). There is zero impersonation risk. A user who originally joined through *Invoicer* or *Orgy* can click "Continue with Google" on *Tenvi* and be safely and instantly enrolled into Tenvi! |

### 7.3 End-to-End OAuth Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant GoogleBtn as GoogleAuthButton (Client)
    participant Google as Google Identity Services
    participant Supabase as Supabase Auth Engine
    participant Callback as /auth/callback Route Handler
    participant DB as Postgres (Tenvi RBAC)

    User->>GoogleBtn: Clicks "Sign in with Google" / "Sign up with Google"
    GoogleBtn->>Google: Redirect to accounts.google.com (OAuth 2.0 PKCE)
    Google-->>User: Prompts account selection & consent
    User->>Google: Grants consent
    Google->>Supabase: Redirects to https://xhjkkrjnlorrayuaxbra.supabase.co/auth/v1/callback?code=...
    Supabase->>Supabase: Upserts auth.users (email_verified = true)
    Supabase-->>Browser: Redirects to http://localhost:3000/auth/callback?code=...
    Browser->>Callback: GET /auth/callback?code=...
    Callback->>Supabase: exchangeCodeForSession(code)
    Supabase-->>Callback: Valid session & user payload

    Callback->>DB: checkUserWebsiteMembership(user.id, WEBSITE_ID)
    alt User is Already Enrolled in Tenvi
        DB-->>Callback: true
        Callback-->>Browser: Redirect directly to /dashboard
    else User is NOT Enrolled in Tenvi (New or Cross-Site User)
        DB-->>Callback: false
        Callback->>DB: enrollUserInTenvi(user.id, email, fullName)
        Note over Callback,DB: Creates user_profile if needed & links default user role
        Callback->>DB: seedInitialUserData(user.id)
        Note over Callback,DB: Seeds initial wallet ("Cash on Hand") & default categories
        Callback-->>Browser: Set session cookies & redirect to /dashboard
    end
```

### 7.4 Supabase Dashboard Configuration Guide

To enable Google sign-in for the shared Supabase project:

1. **Access Project**: Log in to [Supabase Dashboard](https://supabase.com/dashboard) and select project `xhjkkrjnlorrayuaxbra`.
2. **Navigate to Providers**: Go to **Authentication** > **Providers** in the left sidebar.
3. **Configure Google**:
   - Scroll to **Google** and toggle it **ON**.
   - Copy the **Callback URL (for OAuth)** shown in the panel:  
     `https://xhjkkrjnlorrayuaxbra.supabase.co/auth/v1/callback`
   - Paste the **Client ID** and **Client Secret** obtained from Google Cloud Console (see Section 7.5).
   - Click **Save**.
4. **Configure Redirect URLs**: Go to **Authentication** > **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (for local development) or your production domain (e.g. `https://tenvi.app`).
   - **Redirect URLs**: Add the following allowlisted patterns:
     - `http://localhost:3000/**`
     - `http://localhost:3000/auth/callback`
     - `https://*.vercel.app/auth/callback`
     - `https://tenvi.app/auth/callback` (or custom production domain)

### 7.5 Google Cloud Console Configuration Guide

1. **Access Google Cloud Console**:
   - Navigate to [https://console.cloud.google.com/](https://console.cloud.google.com/).
   - Select your existing organization/project or create a new project named `Tenvi` (or `Unciano Labs`).
2. **Configure OAuth Consent Screen**:
   - Navigate to **APIs & Services** > **OAuth consent screen**.
   - Choose **External** user type and click **Create**.
   - **App Name**: `Tenvi`
   - **User support email**: Select your developer email.
   - **App logo** *(optional)*: Upload Tenvi icon.
   - **Developer contact information**: Enter your email.
   - **Scopes**: Click **Add or Remove Scopes** and select:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Save and proceed to summary.
3. **Create OAuth 2.0 Client Credentials**:
   - Navigate to **APIs & Services** > **Credentials**.
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - **Application type**: Select **Web application**.
   - **Name**: `Tenvi Web Client` (or `Supabase Auth Client`).
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://xhjkkrjnlorrayuaxbra.supabase.co`
     - `https://tenvi.app` (or your production domain)
   - **Authorized redirect URIs**:
     - `https://xhjkkrjnlorrayuaxbra.supabase.co/auth/v1/callback`  
       *(CRITICAL: This points to your Supabase project URL callback, NOT localhost directly!)*
   - Click **Create**.
4. **Copy Credentials to Supabase**:
   - Copy the generated **Client ID** (e.g. `xxxx-xxxx.apps.googleusercontent.com`).
   - Copy the **Client Secret** (e.g. `GOCSPX-xxxx`).
   - Paste them into Supabase under **Authentication** > **Providers** > **Google**.

### 7.6 Implementation Components Reference

#### 1. OAuth Trigger Button (`src/components/Auth/GoogleAuthButton.tsx`)
- Client Component with solid, non-gradient styling matching the project's slate design system.
- Official Google four-color SVG icon.
- Modes: `'signin' | 'signup' | 'continue'`.
- Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ... } })` with PKCE.
- Includes inline loading spinner and error alert.

#### 2. OAuth Callback Route (`src/app/auth/callback/route.ts`)
- Next.js App Router Route Handler (`GET`).
- Extracts `code` query parameter and executes `exchangeCodeForSession(code)` on the server client, securely writing session cookies.
- Queries `checkUserWebsiteMembership(user.id, WEBSITE_ID)`:
  - If member: forwards directly to `/dashboard`.
  - If not member: safely calls `enrollUserInTenvi` and `seedInitialUserData`, ensuring instant access without secondary password prompts.
- Catches errors and redirects gracefully to `/login?error=...`.

#### 3. Core Enrollment & Seeding (`src/app/actions/auth.ts`)
- `enrollUserInTenvi(userId, email, fullName)`: Executes `enroll_user_in_website` RPC with fallback strategies to guarantee role assignment in `public.user_roles`.
- `seedInitialUserData(userId)`: Seeds default financial categories, "Cash on Hand" float account in `bili_savings`, and user onboarding state in `bili_user_onboarding`.

### 7.7 Security, Error Handling & Session Hardening

1. **PKCE Flow**: Proof Key for Code Exchange is enforced by default in `@supabase/ssr`, preventing authorization code interception attacks.
2. **Open Redirect Mitigation**: The destination URL `next` query parameter is strictly validated (`forwardUrl.startsWith('/') && !forwardUrl.startsWith('//')`), preventing malicious external redirect loops.
3. **Transient OAuth Errors**: If a user cancels Google login or permission is denied, Google sends `?error=access_denied`. The callback catches this and redirects cleanly to `/login?error=...` with user-friendly error banners.

---

## 8. QA & Verification Test Matrix

When testing this auth system or rolling it out to a new website, run through these test scenarios:

| # | Test Scenario | Steps | Expected Result |
|---|---|---|---|
| 1 | **Brand New User Registration (Password)** | Visit `/register` directly. Enter new email, name, password. | Form fields empty initially. User created in `auth.users`, `user_profiles`, and `user_roles` (for target `WEBSITE_ID`). Redirected to `/dashboard`. |
| 2 | **Cross-Site User Login Attempt (Password)** | User registered on *Invoicer* attempts to log into *Tenvi* at `/login`. | Credentials match in `auth.users`. Tenvi role check returns `false`. Session revoked immediately. Auto-redirected to `/register?email=...&name=...&enrolling=true`. |
| 3 | **Cross-Site Enrollment Form State** | Inspect `/register` after redirect from Test 2. | **Email** is pre-populated & `readOnly`. **Name** is pre-populated & editable. **Password** is empty with label "Confirm Account Password". "Connected Account Detected" alert is displayed. |
| 4 | **Cross-Site Enrollment with Wrong Password** | On `/register` from Test 3, submit an incorrect password. | Error message: *"Incorrect password for this account. Please enter your correct account password to activate access."* User remains on registration page; no role created. |
| 5 | **Cross-Site Enrollment with Correct Password** | On `/register` from Test 3, submit the correct platform password (and optionally change name). | Password verified via `signInWithPassword()`. New row inserted in `user_roles` linking user to target website. If name was edited, `user_profiles.full_name` is updated. Redirected to `/dashboard`. |
| 6 | **Enrolled User Subsequent Login** | User from Test 5 logs out and logs back in via `/login`. | Login succeeds immediately. User role confirmed. Redirected directly to `/dashboard`. |
| 7 | **Direct Access via URL manipulation** | Unenrolled authenticated user attempts to browse directly to `/dashboard`. | Intercepted by `dashboard/layout.tsx`. Role check fails. Session revoked. Redirected to `/register?email=...&name=...&enrolling=true`. |
| 8 | **Quoted Environment Variables on Vercel** | Set `WEBSITE_ID="65d4f86e-1829-417a-981f-bc7aad7bc953"` with quotes. | `sanitizeUuid()` strips quotes. No PostgreSQL `22P02` syntax errors. |
| 9 | **Google OAuth Sign In (Fresh User)** | Click "Sign up with Google" on `/register` or "Sign in with Google" on `/login` with an email never registered in Supabase. | Google OAuth prompt opens. On consent, user created in `auth.users`, auto-enrolled in `user_roles` for Tenvi, default wallet/categories seeded. Redirected to `/dashboard`. |
| 10 | **Google OAuth Sign In (Cross-Site User)** | User registered on *Invoicer* clicks "Sign in with Google" on *Tenvi*. | Google confirms email identity. Callback identifies missing Tenvi membership. Automatically executes `enrollUserInTenvi` and seeds data. Redirected to `/dashboard` without password friction. |
| 11 | **Google OAuth Sign In (Existing Enrolled User)** | Already enrolled Tenvi user clicks "Sign in with Google". | Callback detects active Tenvi role. No duplicate roles or data created. Redirected directly to `/dashboard`. |
| 12 | **Google OAuth Cancellation / Rejection** | User clicks Google login but closes the popup or clicks "Cancel" on Google consent screen. | Google redirects with error. Callback intercepts error parameter and redirects to `/login?error=...` with clear error message. No broken page state. |

