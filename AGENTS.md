<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tenvi — Single Source of Truth & AI Agent Operating System

---

## 1. MANDATORY AGENT WORKFLOW & SELF-UPDATE PROTOCOL

> [!IMPORTANT]
> **CRITICAL PROTOCOL FOR ALL AI AGENTS (Antigravity, Claude Code, and autonomous subagents):**
> You MUST read this entire file (`/AGENTS.md`) before planning, designing, or modifying any code in this repository. Every instruction, architectural pattern, security boundary, and styling constraint documented here is mandatory and non-negotiable.

### Core Workflow Requirements
1. **Pre-flight Knowledge Review:** Always read `/AGENTS.md` first. Understand the routing model, multi-tenant isolation, Supabase client separation, and strict borderless/gradient-free UI design rules before opening or modifying files.
2. **Follow Strict Conventions:** Never invent alternative conventions or use outdated patterns from earlier Next.js versions (e.g., do NOT create `middleware.ts`; this codebase strictly uses `src/proxy.ts` under Next.js 16).
3. **Strict Quality Gates:** Before submitting any task:
   - Run `npx tsc --noEmit` to ensure zero TypeScript errors.
   - Run `npm run test` (Vitest) to ensure all financial calculation and logic tests pass.
   - Run `npm run check:design` to prevent regression of ADR 0001 (no decorative borders or gradients).
4. **Definition of Done (Self-Update Rule):**
   - **A task is NEVER complete until `/AGENTS.md` is updated.**
   - Before finishing any turn that modifies code, routes, schemas, utilities, or components, the agent **MUST** update `/AGENTS.md`.
   - Update **Section 3 (Architecture & Directory Structure)** if files, routes, or database tables were added, moved, or deleted.
   - Update **Section 6 (Active Memory & State)** at the bottom with:
     - The updated **Current Focus**.
     - A new rolling entry in **Recent Changes (Max 5)** with the date `[YYYY-MM-DD]` and key files touched (deleting the 6th oldest entry so it never bloats).
     - Any resolved or newly discovered **Known Issues & Tech Debt**.
     - Clear **Next Steps**.
   - **Explicit Mandate:** Even if you use internal task artifacts, checklists, or implementation plans (such as in Antigravity or Claude Code task agents), you MUST still write the final state updates directly into `/AGENTS.md` before ending your response.

---

## 2. PROJECT OVERVIEW & COMMANDS

### Domain & Purpose
**Tenvi** (historically and internally prefixed as `bili_`) is a high-precision personal wealth and debt management web application tailored specifically for the Philippine financial ecosystem. It enables individuals and households to track cash flow, manage debt amortization schedules, oversee shared expenses, and manage physical assets with intelligent AI assistance:
- **Banking & Cash Accounts:** Tracking multi-tier accounts across Philippine traditional banks (BDO, BPI, Metrobank, UnionBank, Security Bank, etc.), digital banks (Maya, CIMB, GoTyme, SeaBank, Tonik), and physical cash envelopes.
- **Credit Cards & Billing Cycles:** Statement date and due date calculation, statement generation, payment tracking, limit utilization, and credit card installment amortization.
- **Receivables & Personal Loans:** Tracking money lent to family, friends, or borrowers with interest calculation, installment schedules, downpayment tracking, and SMS/Email reminders.
- **Liabilities & Debt Amortization:** Complete amortization engine handling mortgages, auto loans, personal loans, and BNPL. Supports both annual reducing balance and monthly add-on interest modes, custom payment due days, and automatic account linking (credit card limit locks and savings auto-deductions).
- **Properties & Fixed Assets:** Tracking vehicles, real estate, land, and equipment with valuations, depreciation, expense/income logs, and a secure document vault (OR/CR, insurance policies, deeds) with expiration alerts.
- **Bill Splits:** Splitting restaurant, utility, and travel bills among contacts with partial payment tracking.
- **AI Financial Intelligence:** Gemini 2.5/Flash-powered statement extraction, receipt scanning (OCR via Tesseract.js / PDF-parse), and conversational financial queries with strict daily token rate-limiting.
- **Multi-Tenant System:** Built with tenant isolation using a canonical `WEBSITE_ID` (`65d4f86e-1829-417a-981f-bc7aad7bc953`) and role-based permissions (`admin` vs. `member`).

### Exact Tech Stack (from `package.json`)
| Layer | Technology & Exact Version |
|---|---|
| **Framework** | **Next.js 16.3.5** (App Router, Server Actions, `proxy.ts`) |
| **Runtime & UI** | **React 19.2.8**, **React DOM 19.2.8** |
| **Language** | **TypeScript 5.x** (`strict: true`, target `ES2020`, path alias `@/*` -> `./src/*`) |
| **Styling** | **Tailwind CSS ^4** (via `@tailwindcss/postcss`), `@theme` in `src/app/globals.css`, `tw-animate-css ^1.4.0` |
| **Design System** | shadcn/ui (`base-nova` style), **Base UI (`@base-ui/react ^1.8.0`)**, `class-variance-authority ^0.7.1`, `cn ^0.4.0` |
| **Icons & Font** | `lucide-react ^1.46.0`, `@tabler/icons-react ^3.49.0`, `@iconify/react ^6.0.2`, Inter font |
| **Database & Auth** | **Supabase** (`@supabase/ssr ^0.12.7`, `@supabase/supabase-js ^2.116.0`), PostgreSQL RLS |
| **Form Handling** | `react-hook-form ^7.88.0`, `@hookform/resolvers ^3.10.0`, `zod ^3.24.2` |
| **Charts & Visuals** | `recharts ^3.8.0` |
| **AI & Document OCR** | `@google/genai ^2.24.0` (Gemini API), `tesseract.js ^7.0.0`, `pdf-parse ^1.1.1` |
| **Notifications** | `nodemailer ^10.0.11` (SMTP/Gmail), httpSMS API (SMS gateway), `sonner ^2.0.8` (in-app toasts) |
| **Dates & Numbers** | `date-fns ^4.4.0`, custom Philippine financial engine (`src/lib/finance/`) |
| **Testing & CI** | `vitest ^5.0.3`, `vite ^8.3.4`, custom design rules validator (`scripts/check-design-rules.mjs`) |

### Terminal Commands
```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Full production build
npm run build

# Start production server
npm run start

# Type checking (Strict TypeScript verification)
npx tsc --noEmit

# Run all unit and integration test suites (Vitest)
npm run test

# Run UI/UX responsiveness and layout audit
npm run test:ui

# Verify compliance with Anti-Border & Anti-Gradient Policy (ADR 0001)
npm run check:design

# Linting (ESLint - Note: Flat config migration pending)
npm run lint
```

---

## 3. ARCHITECTURE & DIRECTORY STRUCTURE

### Annotated Directory Map
```
/
├── .agents/                      # Agent customizations and specialized skills
├── docs/                         # Canonical technical documentation, ADRs, roadmaps
│   ├── adr/                      # Architecture Decision Records (e.g., 0001-borders-policy.md)
│   ├── ui/                       # UI/UX specifications and design constraints
│   ├── ADMIN_AND_MEMBER_DASHBOARD_PLAN.md
│   ├── AUTHENTICATION.md
│   ├── CARDS_REDESIGN_SHADCN_SPEC.md
│   ├── FINTECH_AUDIT_FINDINGS.md
│   ├── INSTALLMENT_AND_AMORTIZATION_ROADMAP.md
│   ├── MVP_ARCHITECTURE_REF.md
│   ├── ONBOARDING.md
│   └── PROJECT_PLAN.md
├── public/                       # Static public assets, PWA icons, manifest.json
├── scripts/                      # Validation and CI scripts
│   ├── audit_ui.mjs              # Mobile, tablet, and responsive viewport auditor
│   └── check-design-rules.mjs    # Automated scanner enforcing borderless/gradientless design
├── src/
│   ├── proxy.ts                  # Next.js 16 Edge proxy & route protection (replaces middleware.ts)
│   ├── app/                      # Next.js App Router root
│   │   ├── (auth)/               # Unauthenticated auth route group
│   │   │   ├── login/            # Login page & email sign-in
│   │   │   └── register/         # Account registration page
│   │   ├── actions/              # Server Actions ('use server') for mutations
│   │   │   ├── admin/            # Superadmin actions (broadcasts, members, analytics)
│   │   │   ├── ai.ts             # Gemini Vision statement & receipt processing
│   │   │   ├── auth.ts           # Sign in, sign out, password reset mutations
│   │   │   ├── cards.ts          # Credit card CRUD, statement generation, card installments
│   │   │   ├── feedback.ts       # User feedback submission & status updates
│   │   │   ├── inAppNotifications.ts # In-app alert management
│   │   │   ├── liabilities.ts    # Loans & debts owed, amortization schedules, payment sync
│   │   │   ├── loans.ts          # Receivables lent to others, installment tracking
│   │   │   ├── notifications.ts  # Notification preferences & log dispatch
│   │   │   ├── onboarding.ts     # User onboarding checklist progression
│   │   │   ├── properties.ts     # Property & asset mutations, valuation records
│   │   │   ├── propertyDocuments.ts # Document vault uploads and alert configs
│   │   │   ├── receipts.ts       # Receipt file processing & transaction creation
│   │   │   ├── receivables.ts    # Debtor receivables management
│   │   │   ├── savings.ts        # Bank & cash savings accounts mutations
│   │   │   ├── search.ts         # Global command bar search across all entities
│   │   │   ├── splits.ts         # Group bill split creation & participant logging
│   │   │   ├── statements.ts     # Credit card statement lifecycle
│   │   │   └── transactions.ts   # Income, expense, and transfer transaction mutations
│   │   ├── admin/                # Superadmin portal (analytics, broadcast, feedback, members)
│   │   ├── api/                  # API Route Handlers (cron jobs, AI streaming, exports)
│   │   │   ├── ai/               # AI streaming endpoints & token accounting
│   │   │   ├── cron/             # Scheduled tasks (due date reminders via Bearer auth)
│   │   │   ├── export/           # CSV / JSON financial data export endpoints
│   │   │   └── telemetry/        # Performance and error reporting
│   │   ├── auth/                 # OAuth callback & email verification routes
│   │   ├── dashboard/            # Protected user dashboard root
│   │   │   ├── cards/            # Credit cards module & statement manager
│   │   │   ├── loans/            # Receivables / money lent tracker
│   │   │   ├── properties/       # Property and vehicle asset tracker + document vault
│   │   │   ├── receivables/      # Detailed receivables breakdown
│   │   │   ├── savings/          # Savings and bank account registry
│   │   │   ├── settings/         # Profile, notification settings, SMTP & AI API keys
│   │   │   ├── splits/           # Bill splits manager
│   │   │   ├── support/          # Support ticketing portal
│   │   │   ├── transactions/     # Comprehensive transaction history & search
│   │   │   ├── DashboardOverviewClient.tsx # Interactive client dashboard leaf
│   │   │   ├── layout.tsx        # Dashboard layout with Sidebar and Top Navigation
│   │   │   ├── loading.tsx       # Tonal skeleton loading states
│   │   │   └── page.tsx          # Server Component fetching dashboard datasets in parallel
│   │   ├── dev/                  # Development sandbox & UI showcase
│   │   ├── globals.css           # Tailwind v4 theme variables, design tokens, base CSS
│   │   ├── layout.tsx            # Global HTML layout, ThemeProvider, Sonner Toaster
│   │   ├── page.tsx              # Public landing page
│   │   ├── robots.ts             # SEO robots generator
│   │   └── sitemap.ts            # Dynamic XML sitemap generator
│   ├── components/               # React components directory
│   │   ├── AI/                   # AI chat drawer, receipt photo parser, quota badges
│   │   ├── Admin/                # Admin sidebar, member management tables, broadcast forms
│   │   ├── Auth/                 # Login, signup, password reset modal/page forms
│   │   ├── Cards/                # Visual credit card cards, statement cards, utilization dials
│   │   ├── Dashboard/            # Stat cards, recent activity, quick action buttons
│   │   ├── Forms/                # Entity modal forms (LoanModal, LiabilityModal, PropertyModal)
│   │   ├── Landing/              # Landing page marketing sections & interactive demos
│   │   ├── Navigation/           # Desktop sidebar, mobile bottom navigation, headers, NotificationBell
│   │   ├── Notifications/        # Notification dialog, full history browser
│   │   ├── Onboarding/           # Setup checklist & wizard components
│   │   ├── Properties/           # Asset cards, document vault items, valuation modals
│   │   ├── PWA/                  # PWA installation banner & service worker listener
│   │   ├── Settings/             # Profile, security, notification, and SMTP settings forms
│   │   ├── shared/               # Reusable domain-agnostic widgets (currency display, badges)
│   │   ├── theme-provider.tsx    # Next-themes wrapper
│   │   ├── ui/                   # Base UI / shadcn borderless primitive design system
│   │   └── Widgets/              # Approved external widget components & security guards
│   ├── hooks/                    # Reusable React hooks
│   │   ├── use-mobile.ts         # Viewport breakpoint detection (< 768px)
│   │   ├── useInstallmentForm.ts # Shared calculation & schedule generation hook for modals
│   │   ├── usePwaInstall.ts      # PWA prompt listener hook
│   │   └── useResizeLock.ts      # Debounced window resize jank suppressor for macOS motion
│   ├── lib/                      # Core business logic, backend clients, and helpers
│   │   ├── ai/                   # Gemini GenAI client, system prompts, photo parser, RAG
│   │   ├── analytics/            # Admin aggregation queries
│   │   ├── audit/                # Mutation audit logger (bili_audit_logs)
│   │   ├── auth/                 # Auth guards (requireWebsiteUser, requireWebsiteAdmin, getAuthenticatedUser)
│   │   ├── config/               # System configuration & environment sanitation
│   │   ├── constants.ts          # Canonical IDs (WEBSITE_ID, DEFAULT_ROLE_ID), banks, currencies
│   │   ├── finance/              # Pure financial calculations & amortization engine
│   │   │   ├── accountSync.ts    # Credit card limit locking & savings balance ledger sync
│   │   │   ├── amortizationEngine.ts # Core amortization math (reducing balance vs. add-on)
│   │   │   ├── calculations.ts   # Public calculation facades & formatters
│   │   │   ├── dateResolver.ts   # Statement cycles, month-end clamping, due dates
│   │   │   ├── fx.ts             # Multi-currency conversions
│   │   │   ├── generalLedger.ts  # Double-entry ledger reconciliation
│   │   │   ├── money.ts          # Safe floating-point arithmetic (cents / integer math)
│   │   │   └── tax.ts            # Philippine tax & withholding calculation
│   │   ├── notifications/        # Email (Nodemailer), SMS (httpSMS), templates, daily dispatcher (dispatcher.ts)
│   │   ├── pwa/                  # Service worker registration & metadata
│   │   ├── security/             # AES-256-GCM encryption for stored user API keys
│   │   ├── supabase/             # Supabase clients (client.ts, server.ts)
│   │   ├── support/              # Support tickets database helpers
│   │   ├── utils.ts              # Global utility exports (`cn`)
│   │   └── validations/          # Zod validation schemas (schemas.ts, liabilitySchema, etc.)
│   └── types/                    # TypeScript interfaces & types (index.ts)
└── supabase/
    └── migrations/               # PostgreSQL schema migrations (prefixed bili_*)
```

### File Placement Rules
| If you are creating... | Place it in... | Notes |
|---|---|---|
| **Reusable Primitive UI Component** | `src/components/ui/` | Must be borderless/gradient-free per ADR 0001. Export clean props. |
| **Domain / Feature Component** | `src/components/<Feature>/` | E.g., `src/components/Cards/`, `src/components/Properties/`. |
| **Entity Creation / Edit Modal** | `src/components/Forms/` | Use `prevOpenRef` to prevent keystroke state loss; use `useInstallmentForm` for loans/debts. |
| **Server Action (Mutations)** | `src/app/actions/` | Must start with `'use server'`. Authorize via `requireWebsiteUser()`. |
| **API Route Handler** | `src/app/api/<feature>/route.ts` | Use `NextResponse.json()`. Verify `CRON_SECRET` for cron jobs. |
| **Pure Math / Financial Logic** | `src/lib/finance/` | Pure TypeScript. **Must include a co-located `.test.ts` file**. |
| **Shared Hook** | `src/hooks/` | Prefix with `use`. Client-only. |
| **Zod Schema** | `src/lib/validations/` | Centralize in `schemas.ts` or co-locate specific schema tests. |
| **Global TypeScript Interface** | `src/types/index.ts` | Central source of truth for database rows and action inputs. |

---

## 4. CORE PATTERNS: DATA, AUTH & STATE

### Authentication & Authorization
- **Session Gatekeeping (`src/proxy.ts`):** Next.js 16 uses `src/proxy.ts` (exporting `export async function proxy(request: NextRequest)`). It refreshes Supabase sessions via cookies and protects routes:
  - Any request to `/dashboard*` or `/admin*` without an active session is redirected to `/login?redirect=<path>`.
  - Logged-in users navigating to `/login` or `/register` are redirected to `/dashboard`.
- **Tenant & Website Isolation:** Tenvi is part of a multi-website platform. Every database query **MUST** be scoped to `website_id: WEBSITE_ID` (imported from `@/lib/constants`).
- **Server Auth Guards (`src/lib/auth/guards.ts`):**
  - `getAuthenticatedUser()`: Memoized per request using React `cache()`. Use this in RSC `page.tsx` and layouts.
  - `requireWebsiteUser()`: Enforces that the session exists and the user is enrolled in the website via the `has_website_access` RPC. Returns `{ user, role, isAuthorized, error }`.
  - `requireWebsiteAdmin()`: Enforces admin role via `is_admin` RPC, `getWebsiteUserRole`, or configured admin email (`isUserAdmin(user.email)`).

### Data Fetching & Mutations
- **Server Components Data Fetching:**
  - `page.tsx` files are async Server Components by default.
  - Data is fetched directly from Supabase via `createClient()` from `@/lib/supabase/server`.
  - **Avoid Waterfalls:** Parallelize all top-level queries using `Promise.all([ ... ])` (see `src/app/dashboard/page.tsx`).
  - Always filter by `.eq('website_id', WEBSITE_ID).eq('user_id', user.id).is('deleted_at', null)`.
  - Pass fetched records down to interactive `*Client.tsx` components as props.
- **Server Actions for Mutations:**
  - Defined in `src/app/actions/*.ts` with `'use server'` at the file head.
  - Standard Action Execution Pattern:
    ```typescript
    'use server';

    import { createClient } from '@/lib/supabase/server';
    import { requireWebsiteUser } from '@/lib/auth/guards';
    import { propertySchema } from '@/lib/validations/schemas';
    import { revalidatePath } from 'next/cache';
    import { WEBSITE_ID } from '@/lib/constants';

    export async function createPropertyAction(data: PropertyInput) {
      // 1. Authorize
      const auth = await requireWebsiteUser();
      if (!auth.isAuthorized || !auth.user) {
        return { error: auth.error || 'Unauthorized' };
      }

      // 2. Validate input with Zod
      const parsed = propertySchema.safeParse(data);
      if (!parsed.success) {
        return { error: parsed.error.errors[0]?.message || 'Invalid details' };
      }

      // 3. Perform mutation
      const supabase = await createClient();
      const { data: record, error } = await supabase
        .from('bili_properties')
        .insert({
          website_id: WEBSITE_ID,
          user_id: auth.user.id,
          ...parsed.data,
        })
        .select('id')
        .single();

      if (error) {
        return { error: 'Failed to create record' };
      }

      // 4. Revalidate relevant Next.js routes
      revalidatePath('/dashboard');
      revalidatePath('/dashboard/properties');

      return { success: true, id: record.id };
    }
    ```

### Database & Backend Access Clients
- **Server Component / Server Action Client:**
  ```typescript
  import { createClient } from '@/lib/supabase/server';
  const supabase = await createClient(); // reads/writes cookies via next/headers
  ```
- **Browser Client (Client Components only):**
  ```typescript
  import { createClient } from '@/lib/supabase/client';
  const supabase = createClient();
  ```
- **Admin Service Role Client (Bypasses RLS):**
  ```typescript
  import { createAdminClient } from '@/lib/supabase/server';
  const adminSupabase = createAdminClient();
  ```
  > [!WARNING]
  > `createAdminClient` uses `SUPABASE_SERVICE_ROLE_KEY`. It MUST only be used in server-side operations where RLS bypass is mandatory (e.g., initial user profile enrollment, background cron jobs in `src/app/api/cron/*`, or cross-tenant admin broadcasts). **NEVER import or call this in Client Components.**

### Soft Deletion & Audit Logging
- Tenvi tables implement soft deletion via `deleted_at timestamptz`.
- **Never perform hard `DELETE` queries** on transactions, credit cards, loans, liabilities, savings accounts, or properties. Always update:
  `.update({ deleted_at: new Date().toISOString() }).eq('id', id)`
- Log financial mutations using `logAuditEntry` from `@/lib/audit/logger`.

### Error Handling & Action Responses
- All Server Actions must return a standardized object:
  - On failure: `{ error: string }`
  - On success: `{ success: true, ...additionalData }`
- Client components inspect `res.error`:
  - If present: display toast via `toast.error(res.error)`.
  - If success: display toast via `toast.success('...')`, close modal, and reset form state.

---

## 5. STRICT CODING & NEXT.JS RULES

### Next.js 16 Breaking Conventions
- **No `middleware.ts`:** Next.js 16 deprecates `middleware.ts` in favor of `src/proxy.ts`. Do not re-create `middleware.ts`.
- **Asynchronous Route Contexts:** In Next.js 16, page props `params` and `searchParams` are Promises:
  ```typescript
  // CORRECT (Next.js 16)
  export default async function Page({
    params,
    searchParams,
  }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
  }) {
    const { id } = await params;
    const search = await searchParams;
    ...
  }
  ```

### Server vs. Client Components
- **Default to React Server Components (RSC):** Never add `'use client'` to a `page.tsx` or layout.
- **Leaf-Only Interactivity:** Add `'use client'` only to the smallest leaf components that require browser APIs, React state (`useState`, `useEffect`), or form interactivity.
- Follow the established architecture: `page.tsx` (RSC) -> passes data to `<Feature>Client.tsx` (`'use client'`).

### TypeScript Strictness
- `"strict": true` is enforced in `tsconfig.json`.
- **Strictly ban `any`:** Create explicit types or extend existing types from `src/types/index.ts`.
- All database records must map to an interface in `src/types/index.ts`.
- Form inputs must be inferred directly from Zod schemas: `type FormInput = z.infer<typeof mySchema>`.

### Styling & UI Conventions: ADR 0001 (Borders & Gradients Policy)
> [!CAUTION]
> **Tenvi enforces a strict ANTI-BORDER and ANTI-GRADIENT policy (ADR 0001).**
> Any agent violating these rules will break CI (`npm run check:design`).

1. **No Decorative Borders:**
   - **BANNED:** `border`, `border-t`, `border-b`, `border-border`, `border-slate-200`, `divide-y`, `divide-x`.
   - **ALLOWED ALTERNATIVE:** Use tonal wells (`bg-muted/40`, `bg-muted/60`, `bg-card`), elevation shadows (`shadow-card`, `shadow-lift`, `shadow-sm`), and organic spacing (`gap-4`, `space-y-4`).
   - **ACCESSIBILITY EXCEPTION (WCAG 1.4.11):** Minimal 1px neutral boundary on interactive state controls only (e.g. unchecked Checkboxes, Switch tracks, or `:focus-visible` rings).
2. **No Gradients:**
   - **BANNED:** `bg-gradient-to-*`, gradient text, gradient borders.
   - **ALLOWED ALTERNATIVE:** Pure solid hex/HSL tokens defined in `src/app/globals.css` (e.g., `bg-card`, `bg-surface`, `text-primary`).
3. **Touch Targets & Sizing:**
   - Inputs, buttons, and select triggers must have a minimum height of **48px** (`h-12` or `min-h-12`) on mobile/default to comply with WCAG 2.5.5 touch target size. Compact desktop controls may use **40px** (`h-10`).
   - Inputs must use **16px font size (`text-base` or `text-sm sm:text-base`)** to prevent iOS Safari auto-zoom.
4. **Class Merging:** Always use `cn(...)` imported from `@/lib/utils` (or `cn`).

### Naming & Path Imports
- **Path Aliases:** ALWAYS use `@/...` (e.g., `@/components/ui/button`, `@/lib/supabase/server`, `@/types`). Never use relative traversal (`../../`).
- **Components:** PascalCase (e.g., `CardInstallmentModal.tsx`, `StatCard.tsx`).
- **Utilities & Actions:** camelCase (e.g., `amortizationEngine.ts`, `accountSync.ts`, `liabilities.ts`).
- **Tests:** Co-locate tests with code using `<filename>.test.ts` or `<filename>.test.tsx`.

### Anti-Patterns (What NOT To Do)
- **DO NOT** import server-only modules (`@/lib/supabase/server`, `nodemailer`, `next/headers`, `crypto`, `fs`) into Client Components (`'use client'`).
- **DO NOT** use native browser `alert()`, `confirm()`, or `prompt()`. Use Sonner (`toast.error()`, `toast.success()`) or `<AlertDialog>`.
- **DO NOT** perform hard deletes on core entities; update `deleted_at = new Date().toISOString()`.
- **DO NOT** hardcode tenant IDs; always reference `WEBSITE_ID` from `@/lib/constants`.
- **DO NOT** add raw borders or gradients to UI elements.
- **DO NOT** delete or overwrite the Next.js agent rule comment block at the top of this file.

---

## 6. ACTIVE MEMORY & STATE (DYNAMIC SCRATCHPAD)

> [!NOTE]
> **Agent Protocol:** This section must be reviewed and updated by the AI agent at the end of EVERY turn modifying code. Keep the rolling recent changes log capped at the 5 most recent entries (delete the oldest when adding a new one).

### Current Focus
- Transaction Mutation Resolution & UUID Type Alignment: Diagnosed and resolved PostgreSQL error `column "website_id" is of type uuid but expression is of type text` (PostgreSQL error code 42804) when saving transactions. Created database migration `20261122_fix_atomic_transactions_website_id_uuid.sql` dropping text-signature RPCs and recreating `execute_atomic_transaction` and `execute_atomic_delete_transaction` with `p_website_id uuid`. Implemented resilient zero-downtime direct ledger mutation and soft-deletion fallback in `src/app/actions/transactions.ts` so all transaction saves, batch creations, and deletions succeed immediately without throwing errors.

### Recent Changes (Max 5)
1. `[2026-11-04]`: Transaction Mutation Resolution & UUID Type Fix: Investigated root cause of `column "website_id" is of type uuid but expression is of type text` (PostgreSQL error code 42804) occurring when saving transactions. Found `execute_atomic_transaction` and `execute_atomic_delete_transaction` in `20261015_atomic_transaction_mutation.sql` and `20261020_add_transfer_transaction_type.sql` had declared `p_website_id text` while table `bili_transactions.website_id` is of type `uuid`, which fails without explicit casting. Created migration `supabase/migrations/20261122_fix_atomic_transactions_website_id_uuid.sql` with `p_website_id uuid`, corrected historical migrations, and implemented automatic resilient direct ledger mutation fallbacks (`executeDirectTransactionMutation` and `executeDirectDeleteMutation`) in `src/app/actions/transactions.ts`. Verified with end-to-end integration script and Vitest (25/25 suites passing, 206/206 unit tests). (Files: `src/app/actions/transactions.ts`, `supabase/migrations/20261122_fix_atomic_transactions_website_id_uuid.sql`, `supabase/migrations/20261015_atomic_transaction_mutation.sql`, `supabase/migrations/20261020_add_transfer_transaction_type.sql`, `supabase/migrations/20261025_bili_audit_logs_and_soft_deletes.sql`, `AGENTS.md`).
2. `[2026-11-04]`: Card Colors, Color Picker, 20 Background Patterns & JCB/UnionPay/AMEX Networks: Created reusable `CardColorPicker` component supporting 28 curated accent swatches, HTML color picker tool, and direct `#HEX` input. Expanded card background patterns from 10 to exactly 20 distinct SVG watermark patterns (including topography, diamonds, stars, diagonal lines, moroccan, intersecting circles, crosshatch, triangles, carbon weave, and sunburst). Added support for JCB, UnionPay, and American Express (AMEX) networks with custom SVG vector logos (`JcbLogo`, `UnionPayLogo`, `AmexLogo`, `CardNetworkLogo`), auto-detection from card name, and packed format support (`accent:network:pattern`). Integrated unified color picker, 20 patterns, and 5-network selectors across `CreditCardModal`, `FlippableCreditCard`, `SavingsModal`, `FlippableSavingsCard`, and `CardDetailsClient`. Added unit test suites verifying all 20 patterns, 5 networks, hex codes, and theme lookups in vitest (25/25 suites passing, 206/206 tests). (Files: `src/components/Cards/CardThemeTokens.tsx`, `src/components/Cards/CardColorPicker.tsx`, `src/components/Forms/CreditCardModal.tsx`, `src/components/Cards/FlippableCreditCard.tsx`, `src/components/Forms/SavingsModal.tsx`, `src/components/Cards/FlippableSavingsCard.tsx`, `src/app/dashboard/cards/[id]/CardDetailsClient.tsx`, `src/components/Cards/cardColorTheme.test.ts`, `AGENTS.md`).
3. `[2026-11-04]`: macOS-style fluid motion physics: Added standard macOS motion design tokens (`--ease-standard`, `--ease-out-soft`, `--ease-spring`, `--dur-fast`, `--dur-base`, `--dur-slow`) into `@theme` and `:root` in `globals.css`. Upgraded sidebar collapsible transition to `--dur-slow` and synchronized content gap with soft content fading (`src/components/ui/sidebar.tsx`, `Sidebar.tsx`). Upgraded dropdown menus, popovers, selects, and tooltips to macOS spring physics (`data-open:scale-95->1`, `translateY -4px->0`, `--ease-spring` 200ms) with clean fast close (120ms, `--ease-standard`) in `dropdown-menu.tsx`, `popover.tsx`, `select.tsx`, and `tooltip.tsx`. Upgraded dialogs, sheets, and alert dialogs (`dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`, `responsive-dialog.tsx`, `GlobalDialog.tsx`). Created `useResizeLock` hook and `<ResizeLock />` component in `src/hooks/useResizeLock.ts` and mounted in `src/app/layout.tsx` to debounce window resize and prevent transition jank during live dragging. Eliminated `transition-all` across UI primitives and added View Transitions API CSS tokens for card reflows. (Files: `src/app/globals.css`, `src/app/layout.tsx`, `src/hooks/useResizeLock.ts`, `src/components/ui/sidebar.tsx`, `src/components/Navigation/Sidebar.tsx`, `src/components/Navigation/MobileNav.tsx`, `src/components/AI/TenviAIChat.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/select.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/responsive-dialog.tsx`, `src/components/ui/card.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/accordion.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/toggle.tsx`, `src/components/ui/toggle-group.tsx`, `src/components/ui/input-group.tsx`, `src/components/ui/money-input.tsx`, `src/components/ui/GlobalDialog.tsx`, `AGENTS.md`).
4. `[2026-11-04]`: Card expansion effect (350ms ease-out: fast first, then slow): Implemented smooth intrinsic-height card expansion using CSS Grid (`grid-rows-[0fr]` to `grid-rows-[1fr]`) paired with opacity fade (`0 -> 1`) and synchronized 180° chevron rotation over exactly 350ms using exponential deceleration curve `cubic-bezier(0.16, 1, 0.3, 1)`. Added reusable `ExpandableCardContent` primitive in `src/components/ui/card.tsx`, added `--ease-expand` and `--duration-expand` in `src/app/globals.css`, upgraded `CollapsibleContent` (`src/components/ui/collapsible.tsx`) and `AccordionContent` (`src/components/ui/accordion.tsx`), and applied across statement cycle cards in `CardDetailsClient.tsx`, loan breakdown cards in `ReceivableEntityClient.tsx`, and mission cards in `OnboardingLaunchpad.tsx`. Tested live via headless Chrome CDP measuring 86.4% height expansion and 155.5° chevron rotation at T=120ms before smoothly gliding into full settlement at 350ms. (Files: `src/components/ui/card.tsx`, `src/components/ui/collapsible.tsx`, `src/components/ui/accordion.tsx`, `src/app/globals.css`, `src/app/dashboard/cards/[id]/CardDetailsClient.tsx`, `src/app/dashboard/receivables/[id]/ReceivableEntityClient.tsx`, `src/components/Onboarding/OnboardingLaunchpad.tsx`, `src/components/Cards/BestCardTodayPanel.tsx`, `src/app/dev/ui/page.tsx`, `scripts/test-browser-card-expand.mjs`, `AGENTS.md`).
5. `[2026-11-04]`: Tactile button press physics with 1/4x slower spring back (1000ms): Adjusted the release spring-back transition to 1/4x speed (`duration-1000` / 1000ms) while keeping active press sink snappy (75ms `ease-out` to 95% scale) using `cubic-bezier(0.34, 1.56, 0.64, 1)` in `src/components/ui/button.tsx` and `src/app/globals.css`. Verified live trajectory in headless Chrome over CDP, measuring active press at 0ms (`matrix(0.95, ...)`), rebound at +250ms (`matrix(0.9891, ...)`), overshoot at +500ms (`matrix(1.0048, ...)`), and settling at +1000ms (`matrix(1, ...)`), generating walkthrough artifact. (Files: `src/components/ui/button.tsx`, `src/app/globals.css`, `AGENTS.md`).
5. `[2026-11-04]`: Due date notification system diagnosis, repair & dispatcher modularization: Diagnosed why due date reminder emails were not being received (since commit `6860fb2` on Oct 14, `/api/cron/notifications` failed-closed with 401 because `CRON_SECRET` was unconfigured in `.env.local` and Vercel environment variables, and no admin execution path existed). Verified Gmail SMTP credentials live with 250 OK. Extracted `dispatchDailyNotifications` into `src/lib/notifications/dispatcher.ts` with unit test suite, upgraded `/api/cron/notifications/route.ts` with multi-path authorization (Bearer CRON_SECRET, authenticated admin session, dev mode fallback), added `triggerManualNotificationsCronAction` and a "Run Now" button in `AdminSettingsPage` (`/admin/settings`), standardized Philippine timezone handling via `getTodayManila` in `checkAndSendCardDueAlertsAction`, generated random `CRON_SECRET` in `.env.local`, updated `.env.example`, and successfully delivered live card due reminder. (Files: `src/lib/notifications/dispatcher.ts`, `src/lib/notifications/dispatcher.test.ts`, `src/app/api/cron/notifications/route.ts`, `src/app/actions/admin/settings.ts`, `src/app/admin/settings/page.tsx`, `src/app/actions/notifications.ts`, `.env.example`, `AGENTS.md`).

### Known Issues & Tech Debt
1. **ESLint 9 Flat Config Migration:** `npm run lint` fails because ESLint v9 expects `eslint.config.mjs` (flat configuration) while the project currently lacks the migrated config file.
2. **Design Rule Allowlist Cleanup:** `npm run check:design` flags legacy decorative borders in `PropertyModal.tsx`, `AdminSidebar.tsx`, `AdminTopHeader.tsx`, and `NotificationBell.tsx`. These require conversion to tonal wells or registration in `design-rules-allowlist.json`.

### Next Steps
1. Guide user to add `CRON_SECRET` to their Vercel Project Environment Variables so Vercel automated daily cron triggers `/api/cron/notifications` with valid authorization.
2. Add an `eslint.config.mjs` flat configuration compatible with ESLint 9 and Next.js 16 to restore `npm run lint`.
3. Refactor remaining border violations in `AdminSidebar.tsx` and `NotificationBell.tsx` to tonal shadow wells to make `npm run check:design` pass completely.
4. Keep `/AGENTS.md` updated as the mandatory final step for every subsequent task.
