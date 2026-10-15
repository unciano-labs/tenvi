# Tenvi Admin & Member Dashboard Architecture & Engineering Specification

> **Document Type**: Technical Specification & Implementation Plan  
> **Status**: Approved Blueprint  
> **Scope**: Admin Control Plane, Route Isolation, Members Directory, Direct Feedback Inbox, System Configuration & First-Party Analytics  
> **Target Audience**: Full-Stack Engineers, AI Coding Agents, Security Auditors  
> **Target Codebase**: Next.js 15 App Router (`src/app`), TypeScript, Tailwind CSS, Supabase SSR & PostgreSQL  

---

## 1. Executive Summary & Architecture Blueprint

This specification details the comprehensive engineering plan to establish an isolated **Admin Control Plane (`/admin`)** alongside the existing **Member Wealth Hub (`/dashboard`)** for Tenvi. 

The architecture guarantees:
1. **Zero-Trust Route Isolation**: Strict server-side route guarding preventing non-admin members from accessing `/admin`, with seamless one-click switching for admins between personal finances and system operations.
2. **FinTech Privacy Guarantee**: Complete separation of member identity and operational metrics from private financial ledger entries. Admins can view activity volume and debug issues without ever accessing balances, merchant names, or bank account numbers.
3. **High-Performance Caching**: Dynamic system switches (maintenance mode, registration gate, AI quotas) cached at the edge using Next.js `unstable_cache` with tag-based invalidation (`revalidateTag`).
4. **First-Party Privacy-Preserving Telemetry**: High-accuracy traffic, conversion, and feature usage analytics without relying on third-party tracking scripts or storing raw IP addresses (GDPR and ePrivacy compliant daily salted hash).

```
                      ┌─────────────────────────────────────────┐
                      │          Browser / Client PWA           │
                      └────────────────────┬────────────────────┘
                                           │
                        ┌──────────────────┴──────────────────┐
                        │ Next.js App Router (Server Runtimes)│
                        └────────┬───────────────────┬────────┘
                                 │                   │
                  ┌──────────────┴───────┐   ┌───────┴──────────────┐
                  │  /dashboard/* Layout │   │   /admin/* Layout    │
                  │ requireWebsiteUser() │   │ requireWebsiteAdmin()│
                  └──────────────┬───────┘   └───────┬──────────────┘
                                 │                   │
                                 ▼                   ▼
                     Personal Wealth Data      Admin Control Plane
                     (Balances, Ledgers,       (Members, Feedback,
                      Loans, Properties)        Config, Telemetry)
                                 │                   │
                                 └─────────┬─────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │         Supabase PostgreSQL DB          │
                      │  - public.is_admin() Security Definer   │
                      │  - Strict Multi-Tenant Row Level Sec.   │
                      │  - Privacy-Preserving RPCs (No Balances)│
                      └─────────────────────────────────────────┘
```

---

## Phase 1: Two-Tier Auth & Route Isolation

### Objective
Lock down the operational boundary between `/admin` and `/dashboard` using a lightweight, performant two-role system (`admin` vs `member`) without bloat or overcomplicated RBAC hierarchies.

---

### Task 1.1: Strict Two-Role Guard (`src/lib/auth/guards.ts`)

#### 1. Context & Role Standardization
Tenvi operates on a shared PostgreSQL multi-website database. In this architecture:
- Normal members are assigned role `'member'` (standardizing legacy `'user'`).
- System operators are assigned role `'admin'`.
- The database stores roles in `public.website_roles` scoped by `website_id`.

#### 2. Type Definitions
```typescript
// src/lib/auth/types.ts
export type UserRole = 'admin' | 'member';

export interface AuthGuardResult {
  user: import('@supabase/supabase-js').User | null;
  role: UserRole | null;
  error: string | null;
  isAuthorized: boolean;
}
```

#### 3. Guard Implementation Logic
Add `requireWebsiteAdmin` and helper `getWebsiteUserRole` to `src/lib/auth/guards.ts`:

```typescript
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID, ADMIN_EMAIL, isUserAdmin } from '@/lib/constants';
import { UserRole, AuthGuardResult } from './types';

/**
 * Retrieves the current user's role for the website, memoized per request.
 * Normalizes legacy 'user' database role to canonical 'member'.
 */
export const getWebsiteUserRole = cache(
  async (userId: string, websiteId: string = WEBSITE_ID): Promise<UserRole> => {
    if (!userId || !websiteId) return 'member';

    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('get_user_website_role', {
        p_website_id: websiteId,
        p_user_id: userId,
      });

      if (!error && data) {
        return (data === 'admin' ? 'admin' : 'member') as UserRole;
      }
    } catch (e) {
      console.warn('[getWebsiteUserRole] RPC lookup failed, falling back:', e);
    }

    // Direct fallback if RPC is unavailable
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient();
        const { data: roleData } = await admin
          .from('user_roles')
          .select('website_roles!inner(role, website_id), user_profiles!inner(user_id)')
          .eq('user_profiles.user_id', userId)
          .eq('website_roles.website_id', websiteId)
          .maybeSingle();

        const rawRole = (roleData?.website_roles as any)?.role;
        return rawRole === 'admin' ? 'admin' : 'member';
      }
    } catch (err) {
      console.error('[getWebsiteUserRole] Admin client fallback failed:', err);
    }

    return 'member';
  }
);

/**
 * Enforces that the incoming request is executed by an authenticated administrator.
 * Performs dual-layer validation:
 * 1. Checks session existence.
 * 2. Checks database role === 'admin'.
 * 3. Secondary fail-safe: checks env ADMIN_USER_ID or isUserAdmin(email).
 */
export async function requireWebsiteAdmin(websiteId: string = WEBSITE_ID): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      role: null,
      error: 'Unauthorized: Authentication required',
      isAuthorized: false,
    };
  }

  // Dual Check: Database role + Environment Fail-safe
  const dbRole = await getWebsiteUserRole(user.id, websiteId);
  const isEnvAdminId = process.env.ADMIN_USER_ID && user.id === process.env.ADMIN_USER_ID.trim();
  const isEnvAdminEmail = isUserAdmin(user.email);

  const isAdmin = dbRole === 'admin' || Boolean(isEnvAdminId) || Boolean(isEnvAdminEmail);

  if (!isAdmin) {
    return {
      user,
      role: dbRole,
      error: 'Forbidden: Administrator privileges required',
      isAuthorized: false,
    };
  }

  return {
    user,
    role: 'admin',
    error: null,
    isAuthorized: true,
  };
}
```

---

### Task 1.2: Route Group Separation & Navigation Integration

#### 1. App Router Directory Structure
Organize routes into explicit paths:
```
src/app/
├── (auth)/
│   ├── login/
│   └── register/
├── dashboard/               <-- Member Wealth Hub
│   ├── layout.tsx           <-- Enforces requireWebsiteUser()
│   ├── page.tsx             <-- Wealth Overview
│   ├── transactions/
│   ├── cards/
│   ├── loans/
│   ├── properties/
│   └── settings/
└── admin/                   <-- Admin Control Plane
    ├── layout.tsx           <-- Enforces requireWebsiteAdmin()
    ├── page.tsx             <-- Admin Command Dashboard
    ├── members/             <-- Directory & Audit Inspection
    ├── feedback/            <-- Triage Inbox & Bug Tracker
    ├── settings/            <-- System Switches & Cron Monitor
    └── analytics/           <-- Funnels & Telemetry
```

#### 2. Admin Layout (`src/app/admin/layout.tsx`)
```typescript
import { redirect } from 'next/navigation';
import { requireWebsiteAdmin } from '@/lib/auth/guards';
import { AdminSidebar } from '@/components/Navigation/AdminSidebar';
import { AdminTopHeader } from '@/components/Navigation/AdminTopHeader';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireWebsiteAdmin();

  // If not logged in, redirect to login with return path
  if (!auth.user) {
    redirect('/login?redirect=/admin');
  }

  // If logged in as member, redirect directly back to member dashboard
  if (!auth.isAuthorized) {
    redirect('/dashboard?error=unauthorized_admin');
  }

  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden bg-background flex flex-col md:flex-row">
      <AdminSidebar userEmail={auth.user.email || ''} />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <AdminTopHeader userEmail={auth.user.email || ''} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 overscroll-contain">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
```

#### 3. TopHeader Quick-Toggle Integration (`src/components/Navigation/TopHeader.tsx`)
In `src/app/dashboard/layout.tsx`, pass `userRole` to `TopHeader`:
```typescript
// Inside TopHeader props:
interface TopHeaderProps {
  userName: string;
  userEmail: string;
  userRole?: 'admin' | 'member';
}
```

In `TopHeader.tsx`:
1. **Desktop Header Action**: When `userRole === 'admin'`, render a badge toggle:
   ```tsx
   {userRole === 'admin' && (
     <Link
       href="/admin"
       className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-2xs font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
     >
       <ShieldAlert className="size-3.5" />
       <span>Admin Panel</span>
     </Link>
   )}
   ```
2. **Profile Dropdown Menu**:
   - Add a direct link to `/admin` above the Log Out button with a distinct admin badge.
   - On `/admin`, show a corresponding `"Return to Personal Vault"` button linking back to `/dashboard`.

---

### Task 1.3: Database RLS Security Function (`public.is_admin`)

Create migration `supabase/migrations/20261110_bili_admin_security_definer.sql`:

```sql
-- 1. Helper function to check if the current user is an admin for this website
create or replace function public.is_admin(
  p_website_id uuid default '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.user_roles ur
    join public.user_profiles up on up.id = ur.user_profile_id
    join public.website_roles wr on wr.id = ur.website_role_id
    where up.user_id = p_user_id
      and wr.website_id = p_website_id
      and wr.role = 'admin'
  );
end;
$$;

grant execute on function public.is_admin(uuid, uuid) to authenticated, anon, service_role;

-- 2. Helper function to retrieve exact role name
create or replace function public.get_user_website_role(
  p_website_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role text;
begin
  select wr.role into v_role
  from public.user_roles ur
  join public.user_profiles up on up.id = ur.user_profile_id
  join public.website_roles wr on wr.id = ur.website_role_id
  where up.user_id = p_user_id
    and wr.website_id = p_website_id
  limit 1;

  return coalesce(v_role, 'member');
end;
$$;

grant execute on function public.get_user_website_role(uuid, uuid) to authenticated, anon, service_role;

-- 3. Composite performance indexes
create index if not exists idx_user_roles_composite 
  on public.user_roles (user_profile_id, website_role_id);

create index if not exists idx_website_roles_lookup 
  on public.website_roles (website_id, role);
```

---

## Phase 2: Members Directory & Account Control

### Objective
Provide visibility into member accounts, registration timing, and engagement frequency to debug member-reported issues, **while strictly maintaining FinTech privacy (zero access to balances, account numbers, or ledger values)**.

---

### Task 2.1: Privacy-Preserving Member Summary RPC (`get_admin_members_list`)

Create migration `supabase/migrations/20261111_bili_admin_members_rpc.sql`:

```sql
create or replace function public.get_admin_members_list(
  p_website_id uuid,
  p_search text default null,
  p_status text default 'all',
  p_limit integer default 25,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_banned boolean,
  banned_until timestamptz,
  accounts_count bigint,
  transactions_count bigint,
  properties_count bigint,
  loans_count bigint,
  credit_cards_count bigint,
  last_activity_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  -- 1. Security Check: Caller MUST be website admin
  if not public.is_admin(p_website_id, auth.uid()) then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  return query
  select 
    u.id as user_id,
    u.email::text,
    coalesce(up.full_name, split_part(u.email, '@', 1))::text as full_name,
    u.created_at,
    u.last_sign_in_at,
    coalesce(u.banned_until > now(), false) as is_banned,
    u.banned_until,
    -- Operational counts only (NO financial balances or values exposed)
    (select count(*) from public.bili_accounts a 
     where a.user_id = u.id and a.website_id = p_website_id::text and a.deleted_at is null) as accounts_count,
    (select count(*) from public.bili_transactions t 
     where t.user_id = u.id and t.website_id = p_website_id::text and t.deleted_at is null) as transactions_count,
    (select count(*) from public.bili_properties p 
     where p.user_id = u.id and p.website_id = p_website_id::text and p.deleted_at is null) as properties_count,
    (select count(*) from public.bili_loans l 
     where l.user_id = u.id and l.website_id = p_website_id::text and l.deleted_at is null) as loans_count,
    (select count(*) from public.bili_credit_cards c 
     where c.user_id = u.id and c.website_id = p_website_id::text and c.deleted_at is null) as credit_cards_count,
    -- Last recorded activity timestamp
    (select max(al.created_at) from public.bili_audit_logs al 
     where al.user_id = u.id and al.website_id = p_website_id::text) as last_activity_at
  from auth.users u
  join public.user_profiles up on up.user_id = u.id
  join public.user_roles ur on ur.user_profile_id = up.id
  join public.website_roles wr on wr.id = ur.website_role_id
  where wr.website_id = p_website_id
    and wr.role in ('member', 'user')
    and (
      p_search is null or 
      u.email ilike '%' || p_search || '%' or 
      up.full_name ilike '%' || p_search || '%'
    )
    and (
      p_status = 'all' or
      (p_status = 'active' and (u.banned_until is null or u.banned_until <= now())) or
      (p_status = 'suspended' and u.banned_until > now())
    )
    and (
      p_cursor_created_at is null or 
      (u.created_at, u.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by u.created_at desc, u.id desc
  limit p_limit;
end;
$$;

grant execute on function public.get_admin_members_list to authenticated, service_role;
```

---

### Task 2.2: Member Management Server Actions (`src/app/actions/admin/members.ts`)

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { requireWebsiteAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

/**
 * Suspends a member's access for a specified duration in hours (e.g. 720 for 30 days).
 */
export async function suspendMemberAction(userId: string, durationHours: number, reason: string) {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    const banDuration = durationHours > 0 ? `${durationHours}h` : '87600h'; // ~10 years for permanent

    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: banDuration,
    });

    if (banError) throw banError;

    // Record immutable admin action in audit log
    await admin.from('bili_audit_logs').insert({
      website_id: WEBSITE_ID,
      user_id: auth.user.id,
      action: 'ADMIN_SUSPEND_USER',
      entity_type: 'user',
      entity_id: userId,
      new_data: { durationHours, reason },
    });

    revalidatePath('/admin/members');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to suspend member' };
  }
}

/**
 * Removes ban from a member account.
 */
export async function unsuspendMemberAction(userId: string) {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    });

    if (error) throw error;

    await admin.from('bili_audit_logs').insert({
      website_id: WEBSITE_ID,
      user_id: auth.user.id,
      action: 'ADMIN_UNSUSPEND_USER',
      entity_type: 'user',
      entity_id: userId,
    });

    revalidatePath('/admin/members');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to unsuspend member' };
  }
}

/**
 * Triggers a password reset email to the member.
 */
export async function triggerMemberPasswordResetAction(userEmail: string) {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenvi.app'}/auth/reset-password`,
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to trigger reset' };
  }
}
```

---

### Task 2.3: Members Management UI & Activity Drawer (`src/app/admin/members/page.tsx`)

#### 1. Page Component Features
- **Search & Filters**: Real-time debounce email/name search, status filter (`All`, `Active`, `Suspended`).
- **Data Table**:
  - Member identifier (Email, Name, Avatar initial).
  - Join Date (`formatDate`).
  - Last Active (Relative time: e.g. "2 hours ago").
  - Operational Footprint: Badges showing transactions count, cards count, properties count.
  - Status indicator (Green for Active, Red for Suspended).
  - Action Menu: Suspend modal, Unsuspend, Trigger Password Reset, View Audit Log.

#### 2. Slide-Over Activity Drawer (`src/components/Admin/MemberActivityDrawer.tsx`)
- Triggered by clicking on any member row.
- Queries `bili_audit_logs` for `user_id = selectedUserId` (ordered by `created_at desc` limit 50).
- Displays a clean visual timeline:
  - 🟢 `INSERT transaction` (Timestamp, Device IP).
  - 🟡 `UPDATE property` (Fields changed).
  - 🔵 `USER_LOGIN` (Client OS, Browser).
  - 🔴 `SOFT_DELETE loan` (Entity ID).
- **Zero Financial Numbers**: The drawer displays metadata only (`action`, `entity_type`, `created_at`), never transaction amounts or bank details.

---

## Phase 3: Direct Member Feedback Inbox

### Objective
Provide an in-app channel for members to submit bugs, feature ideas, and accounting questions, while automatically capturing technical environment context (route, PWA mode, screen dimensions) to minimize debugging overhead.

---

### Task 3.1: `bili_feedback` Schema & RLS

Create migration `supabase/migrations/20261112_bili_feedback_schema.sql`:

```sql
create table if not exists public.bili_feedback (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null default '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bug', 'feature', 'accounting_issue', 'ux_ui', 'other')),
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'wont_fix')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  message text not null,
  page_url text,
  device_meta jsonb not null default '{}'::jsonb,
  dev_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feedback_status_created 
  on public.bili_feedback (website_id, status, created_at desc);

create index if not exists idx_feedback_user 
  on public.bili_feedback (user_id);

alter table public.bili_feedback enable row level security;

-- Members can insert their own feedback tickets
create policy "Members can insert feedback"
  on public.bili_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Members can view their own previously submitted tickets
create policy "Members can view their own feedback"
  on public.bili_feedback for select
  to authenticated
  using (auth.uid() = user_id);

-- Admins have full access to select, update, and delete all feedback
create policy "Admins have full feedback access"
  on public.bili_feedback for all
  to authenticated
  using (public.is_admin(website_id, auth.uid()))
  with check (public.is_admin(website_id, auth.uid()));
```

---

### Task 3.2: Member Feedback Modal (`src/components/Forms/FeedbackModal.tsx`)

#### 1. Features
- Trigger button placed in:
  - Desktop `Sidebar.tsx` (bottom footer area: "Report Bug / Feedback").
  - Mobile `TopHeader.tsx` sheet menu.
- **Context Auto-Detection**:
  - `page_url`: captured via Next.js `usePathname()`.
  - `device_meta`:
    - Screen size (`${window.innerWidth}x${window.innerHeight}`).
    - User Agent / Browser.
    - Standalone PWA detection: `window.matchMedia('(display-mode: standalone)').matches`.
    - Local time / timezone.
- Feedback Types with visual icons:
  - 🐞 Bug / Error
  - 💡 Feature Request
  - 📊 Accounting / Calculation Question
  - ✨ Design / UX Feedback
- Text area with character counter (min 10 chars, max 2000 chars).
- Submit action via Server Action with instant Sonner toast notification.

---

### Task 3.3: Admin Triage View (`src/app/admin/feedback/page.tsx`)

#### 1. Views & Filtering
- Filter tabs: `New` (badge with unread count), `In Progress`, `Resolved`, `All`.
- Category tags: `Bug` (red), `Feature` (purple), `Accounting` (blue), `UX` (green).

#### 2. Card Content & Actions
- Member email & avatar.
- Target URL where bug was reported (with direct clickable link).
- Device badge (e.g. `📱 iOS PWA Standalone • 390x844`).
- Quick-update buttons:
  - Mark `In Progress`
  - Mark `Resolved`
  - Mark `Won't Fix`
- **Private Dev Notes**:
  - Text area for administrator to record commit hash, GitHub issue reference, or reproduction steps.
  - Debounced auto-save or quick "Save Note" button.

---

## Phase 4: Developer Settings & System Configuration

### Objective
Provide a centralized control room to toggle operational modes, manage rate limits, and inspect cron job executions without redeploying application code.

---

### Task 4.1: Cached Dynamic System Config (`bili_system_config`)

Create migration `supabase/migrations/20261113_bili_system_config.sql`:

```sql
create table if not exists public.bili_system_config (
  key text primary key,
  website_id uuid not null default '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.bili_system_config enable row level security;

-- Everyone can read system config (needed for maintenance check and registration gate)
create policy "Allow reading system config"
  on public.bili_system_config for select
  to authenticated, anon
  using (true);

-- Only admins can modify system config
create policy "Only admins can modify system config"
  on public.bili_system_config for all
  to authenticated
  using (public.is_admin(website_id, auth.uid()))
  with check (public.is_admin(website_id, auth.uid()));

-- Pre-seed default configuration keys
insert into public.bili_system_config (key, value, description)
values
  ('registration_gate', '{"mode": "open"}'::jsonb, 'Sign-up access mode: open, invite_only, closed'),
  ('maintenance_mode', '{"enabled": false, "read_only": false, "message": "Scheduled maintenance in progress. Please check back shortly."}'::jsonb, 'System maintenance switches'),
  ('maintenance_banner', '{"enabled": false, "message": "", "severity": "info"}'::jsonb, 'Global dashboard announcement banner'),
  ('ai_quotas', '{"daily_message_limit": 30, "model": "gemini-flash-latest", "allow_vision": true}'::jsonb, 'Tenvi AI consumption limits'),
  ('feature_flags', '{"ocr_statements": true, "open_banking": false, "fx_auto_sync": true}'::jsonb, 'Commercial feature availability toggles')
on conflict (key) do nothing;
```

#### 2. Cached Config Helper (`src/lib/config/systemConfig.ts`)
```typescript
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

export interface SystemConfigMap {
  registration_gate: { mode: 'open' | 'invite_only' | 'closed' };
  maintenance_mode: { enabled: boolean; read_only: boolean; message: string };
  maintenance_banner: { enabled: boolean; message: string; severity: 'info' | 'warning' | 'alert' };
  ai_quotas: { daily_message_limit: number; model: string; allow_vision: boolean };
  feature_flags: { ocr_statements: boolean; open_banking: boolean; fx_auto_sync: boolean };
}

/**
 * Fetches all system configuration parameters, cached across requests.
 * Revalidated on-demand when an administrator saves an update.
 */
export const getSystemConfig = unstable_cache(
  async <K extends keyof SystemConfigMap>(key: K): Promise<SystemConfigMap[K]> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from('bili_system_config')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    return data?.value as SystemConfigMap[K];
  },
  ['system-config'],
  { tags: ['system-config'], revalidate: 3600 }
);

/**
 * Updates a configuration key and immediately purges cache tag.
 */
export async function updateSystemConfig<K extends keyof SystemConfigMap>(
  key: K,
  value: SystemConfigMap[K],
  userId: string
) {
  const admin = createAdminClient();
  const { error } = await admin.from('bili_system_config').upsert({
    key,
    value,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  revalidateTag('system-config');
}
```

---

### Task 4.2: Operational Switches (`src/app/admin/settings/page.tsx`)

#### 1. Registration Gate
- **Open**: Any visitor can register at `/register`.
- **Invite-Only**: Visitors require a valid invite token query parameter `?invite=TOKEN`.
- **Closed**: Registration disabled; redirects visitors to a `"Registrations Closed"` waiting list card.

#### 2. Maintenance Banner & Read-Only Mode
- **Global Banner**: Renders a dismissible or permanent announcement banner at the top of `/dashboard` (e.g. "Scheduled DB migration Sunday at 02:00 AM UTC").
- **Read-Only Mode**: When enabled, mutation Server Actions (`transactions.ts`, `cards.ts`, `loans.ts`) verify config before writing. If `read_only === true`, reject mutation with: `"System is in maintenance read-only mode. No edits can be saved right now."`

#### 3. AI Quota Guard (`TenviAIChat`)
- Control daily message count limit (default 30 messages/day/member).
- Server Action `processAIChatMessageAction` checks `bili_ai_usage` count for the current date before invoking Google Gemini API:
  ```typescript
  const config = await getSystemConfig('ai_quotas');
  const countToday = await getDailyAIUsageCount(user.id);
  if (countToday >= config.daily_message_limit) {
    return { error: `Daily AI assistant limit reached (${config.daily_message_limit} msgs/day). Resets at midnight.` };
  }
  ```

---

### Task 4.3: Cron & FX Monitor

#### 1. Health Inspection Dashboard
Display a card monitoring scheduled jobs:
- **Notifications & Bill Reminders Cron**: Last run timestamp, success/failure status, total notifications dispatched.
- **FX Exchange Rates Engine**: Last sync date from `bili_exchange_rates`, active rate count (`PHP -> USD, EUR, SGD, JPY, GBP, AUD, CAD, HKD`).

#### 2. Manual Trigger Actions
- **"Force Sync FX Rates" Button**: Calls `/api/cron/fx` with `CRON_SECRET` bearer auth and refreshes rates.
- **"Run Bill Due Checks" Button**: Calls `/api/cron/notifications` with `CRON_SECRET` bearer auth to test reminder generation on demand.

---

## Phase 5: Landing Page & Member Analytics

### Objective
Implement first-party, privacy-compliant event tracking to evaluate landing page acquisition funnels, signup conversion rates, and member feature usage without relying on third-party tracking scripts.

---

### Task 5.1: Privacy-Safe Event Ingestion (`bili_analytics_events` & `/api/telemetry`)

#### 1. Daily Salted Session Hash Algorithm
To track unique visitors without storing raw personal data:
$$\text{session\_hash} = \text{SHA256}(\text{client\_ip} + \text{user\_agent} + \text{daily\_salt} + \text{YYYY-MM-DD})$$
- Raw IP addresses are **never stored** in the database.
- Salt rotates daily, making cross-day fingerprinting impossible.
- Compliant with strict GDPR and ePrivacy requirements.

#### 2. Schema Definition (`supabase/migrations/20261114_bili_analytics_schema.sql`)
```sql
create table if not exists public.bili_analytics_events (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null default '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  event_name text not null,
  session_hash text not null,
  user_id uuid references auth.users(id) on delete set null,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text, -- 'mobile', 'tablet', 'desktop'
  browser text,
  is_pwa boolean default false,
  event_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_created_event 
  on public.bili_analytics_events (website_id, created_at desc, event_name);

create index if not exists idx_analytics_session 
  on public.bili_analytics_events (session_hash, created_at);

alter table public.bili_analytics_events enable row level security;

-- Route handler uses service role to insert; only admins can query
create policy "Only admins can query analytics events"
  on public.bili_analytics_events for select
  to authenticated
  using (public.is_admin(website_id, auth.uid()));
```

#### 3. Ingestion API Route (`src/app/api/telemetry/route.ts`)
```typescript
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_name, page_url, referrer, utm_source, utm_medium, utm_campaign, is_pwa, event_data, user_id } = body;

    if (!event_name) {
      return NextResponse.json({ error: 'Missing event_name' }, { status: 400 });
    }

    // Compute Privacy-Preserving Session Hash
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const today = new Date().toISOString().split('T')[0];
    const salt = process.env.ANALYTICS_SALT || 'tenvi-telemetry-default-salt';

    const sessionHash = crypto
      .createHash('sha256')
      .update(`${clientIp}-${userAgent}-${today}-${salt}`)
      .digest('hex')
      .slice(0, 32);

    // Parse Device Type
    const isMobile = /mobile|iphone|android|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    const admin = createAdminClient();
    await admin.from('bili_analytics_events').insert({
      website_id: WEBSITE_ID,
      event_name,
      session_hash: sessionHash,
      user_id: user_id || null,
      page_url: page_url ? String(page_url).slice(0, 500) : null,
      referrer: referrer ? String(referrer).slice(0, 500) : null,
      utm_source: utm_source ? String(utm_source).slice(0, 100) : null,
      utm_medium: utm_medium ? String(utm_medium).slice(0, 100) : null,
      utm_campaign: utm_campaign ? String(utm_campaign).slice(0, 100) : null,
      device_type: deviceType,
      is_pwa: Boolean(is_pwa),
      event_data: event_data || {},
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
```

---

### Task 5.2: Daily Rollup View (`bili_analytics_daily_rollup`)

Create migration `supabase/migrations/20261115_bili_analytics_daily_rollup.sql`:

```sql
create table if not exists public.bili_analytics_daily_rollup (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null default '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  event_date date not null,
  event_name text not null,
  utm_source text default 'direct',
  device_type text default 'unknown',
  is_pwa boolean default false,
  total_events integer not null default 0,
  unique_sessions integer not null default 0,
  unique_users integer not null default 0,
  constraint uq_analytics_rollup unique (website_id, event_date, event_name, utm_source, device_type, is_pwa)
);

create index if not exists idx_analytics_daily_rollup_lookup
  on public.bili_analytics_daily_rollup (website_id, event_date desc, event_name);

-- Materialization function executed nightly by cron
create or replace function public.refresh_analytics_daily_rollup(p_target_date date default current_date - interval '1 day')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bili_analytics_daily_rollup (
    website_id, event_date, event_name, utm_source, device_type, is_pwa, total_events, unique_sessions, unique_users
  )
  select 
    e.website_id,
    e.created_at::date as event_date,
    e.event_name,
    coalesce(e.utm_source, 'direct') as utm_source,
    coalesce(e.device_type, 'desktop') as device_type,
    e.is_pwa,
    count(*) as total_events,
    count(distinct e.session_hash) as unique_sessions,
    count(distinct e.user_id) filter (where e.user_id is not null) as unique_users
  from public.bili_analytics_events e
  where e.created_at::date = p_target_date
  group by e.website_id, e.created_at::date, e.event_name, coalesce(e.utm_source, 'direct'), coalesce(e.device_type, 'desktop'), e.is_pwa
  on conflict (website_id, event_date, event_name, utm_source, device_type, is_pwa)
  do update set
    total_events = excluded.total_events,
    unique_sessions = excluded.unique_sessions,
    unique_users = excluded.unique_users;
end;
$$;
```

---

### Task 5.3: Analytics Dashboard UI (`src/app/admin/analytics/page.tsx`)

#### 1. Landing Page Tab
- **Traffic Overview**:
  - Unique Visitors (30d).
  - Page Views (30d).
  - Bounce Rate estimate.
  - PWA Install Prompt conversion rate.
- **Acquisition Funnel**:
  - `landing_view` $\rightarrow$ `cta_click_get_started` $\rightarrow$ `register_view` $\rightarrow$ `member_enrolled`.
  - Step-by-step conversion percentages.
- **Traffic Sources Table**:
  - Top `utm_source`, `utm_medium`, and referring domains.

#### 2. Member Usage Tab
- **User Activity Metrics**:
  - Daily Active Users (DAU), Weekly Active Users (WAU), Monthly Active Users (MAU).
  - DAU / MAU Stickiness Ratio.
- **7-Day Retention Milestone**:
  - Percentage of new signups who created their first transaction within 7 days.
- **Feature Engagement Breakdown (Bar / Pie Chart)**:
  - Transactions logged.
  - Credit Card statement uploads parsed via OCR/Vision.
  - Loan amortization schedules generated.
  - Property asset tracking records created.
  - Tenvi AI chat queries executed.

---

## 3. Database Migration Summary

All planned migrations strictly adhere to the project's multi-tenant conventions (`website_id` scoping, `SECURITY DEFINER` constraints, and RLS policies):

| Migration File | Description | Core Tables / Functions |
|---|---|---|
| `20261110_bili_admin_security_definer.sql` | Admin security helper functions | `public.is_admin()`, `public.get_user_website_role()` |
| `20261111_bili_admin_members_rpc.sql` | Privacy-safe members directory query | `public.get_admin_members_list()` |
| `20261112_bili_feedback_schema.sql` | Member feedback tickets & RLS | `public.bili_feedback` |
| `20261113_bili_system_config.sql` | Dynamic config key-value store | `public.bili_system_config` |
| `20261114_bili_analytics_schema.sql` | Privacy-preserving telemetry event log | `public.bili_analytics_events` |
| `20261115_bili_analytics_daily_rollup.sql` | Daily aggregated analytics rollup | `public.bili_analytics_daily_rollup` |

---

## 4. Implementation Phasing & Task Checklist

### Phase 1: Two-Tier Auth & Route Isolation
- [x] Implement `requireWebsiteAdmin()` and `getWebsiteUserRole()` in `src/lib/auth/guards.ts`.
- [x] Create and execute `supabase/migrations/20261110_bili_admin_security_definer.sql`.
- [x] Create `src/app/admin/layout.tsx` with strict server redirect logic.
- [x] Update `src/components/Navigation/TopHeader.tsx` with conditional "Admin Panel" toggle.
- [x] Create `src/components/Navigation/AdminSidebar.tsx` and `AdminTopHeader.tsx`.
- [x] Create `src/app/admin/page.tsx` admin command center overview.

### Phase 2: Members Directory & Account Control
- [x] Create and execute `supabase/migrations/20261111_bili_admin_members_rpc.sql`.
- [x] Create `src/app/actions/admin/members.ts` (suspend, unsuspend, password reset, delete, audit logs).
- [x] Build `src/app/admin/members/page.tsx` with search, filter, and operational metrics table.
- [x] Build `src/components/Admin/MemberActivityDrawer.tsx` displaying audit trail without financial balances.

### Phase 3: Direct Member Feedback Inbox
- [x] Create and execute `supabase/migrations/20261112_bili_feedback_schema.sql`.
- [x] Create `src/components/Forms/FeedbackModal.tsx` with automatic route and PWA context detection.
- [x] Add feedback trigger to member navigation in `TopHeader.tsx`.
- [x] Build `src/app/actions/feedback.ts` and `src/app/admin/feedback/page.tsx` triage view with status pills and dev notes editor.

### Phase 4: Developer Settings & System Configuration
- [x] Create and execute `supabase/migrations/20261113_bili_system_config.sql`.
- [x] Implement `src/lib/config/systemConfig.ts` with Next.js `unstable_cache` and `revalidateTag`.
- [x] Build `src/app/actions/admin/settings.ts` and `src/app/admin/settings/page.tsx` with registration gate, maintenance switches, and AI quotas.
- [x] Build background crons & FX monitor with on-demand manual sync trigger.

### Phase 5: Landing Page & Member Analytics
- [x] Create and execute `supabase/migrations/20261114_bili_analytics_schema.sql` (events and daily rollup).
- [x] Implement `src/app/api/telemetry/route.ts` with salted daily session hashing (zero raw IPs).
- [x] Create client tracking utility `src/lib/analytics/tracker.ts`.
- [x] Build `src/app/actions/admin/analytics.ts` and `src/app/admin/analytics/page.tsx` with Acquisition Funnel and Member Engagement dashboards.

