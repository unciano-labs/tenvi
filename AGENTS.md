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
│   └── skills/                   # Domain agent skills (security-audit, ui-ux-tester, ponytail)
│       └── security-audit/       # OWASP/ASVS L2 defensive security auditor & checklists
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
├── promo/                        # Standalone marketing assets (not part of the Next build)
│   ├── tenvi-opener/             # 30s opener: AI → reminders → assets → TenviIcon (index.html + .mp4)
│   └── tenvi-cards-promo/        # 30s promo: add card → colours/patterns → savings → due-date SMS/email (index.html + .mp4)
├── public/                       # Static public assets, PWA icons, manifest.json
├── scripts/                      # Validation, CI, and security scripts
│   ├── audit_ui.mjs              # Mobile, tablet, and responsive viewport auditor
│   ├── check-design-rules.mjs    # Automated scanner enforcing borderless/gradientless design
│   ├── check_headers.py          # Passive live deployment security header & exposure checker
│   └── run_scanners.sh           # Security scanner runner (npm audit, osv-scanner, gitleaks, semgrep)
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
│   │   ├── admin/                # Superadmin portal (analytics, broadcast, feedback, logs, members, settings)
│   │   │   ├── analytics/        # Privacy-safe traffic & retention telemetry
│   │   │   ├── broadcast/        # Member email announcement blasts
│   │   │   ├── feedback/         # Member bug reports & feature suggestions triage
│   │   │   ├── logs/             # Delivery audit trail for Email & SMS notifications
│   │   │   ├── members/          # Member directory, audit trails & account controls
│   │   │   ├── settings/         # System config, gateways (SMTP/httpSMS), logs & AI engine
│   │   │   └── layout.tsx        # Admin layout with AdminSidebar & AdminTopHeader
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
│   │   │   ├── settings/         # User notification preferences, message templates, data export & theme
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
│   │   ├── AI/                   # Tenvi AI copilot (TenviAIChat, ChatHeader, WelcomeState, SuggestionChips, ChatMessageList, ChatComposer, RichCards, getSuggestions, mediaUtils)
│   │   ├── Admin/                # Member drawer, broadcast forms, GatewaysPanel, LogsPanel, AiIntelligencePanel, AdminCardTemplatesPanel
│   │   ├── Auth/                 # Login, signup, password reset modal/page forms, TurnstileWidget
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
│   │   ├── useResizeLock.ts      # Debounced window resize jank suppressor for macOS motion
│   │   └── useSpeechRecognition.ts # Web Speech API voice dictation hook for Tenvi AI
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
│   │   ├── security/             # AES-256-GCM encryption, rate limiting (rateLimit.ts), and Cloudflare Turnstile (turnstile.ts)
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
5. **Layout System (globals.css utilities):**
   - Page headers: `<div className="page-header"><div>{h1.text-display + description}</div><div className="page-header-actions">…</div></div>` — wraps intrinsically, never crushes the title.
   - Stat rows: `grid-fluid gap-4 [--grid-min:14rem]`; item lists: `grid-fluid-fill gap-4 [--grid-min:18rem]`.
   - Page content is `@container/main` (dashboard + admin layouts). Use container variants (`@xl/main:`, `@3xl/main:`, `@5xl/main:`) for in-page layout, NOT viewport `lg:/xl:` — the 256px sidebar appears at `lg` (1024px), so content is only ~700px wide at 1024.
   - App shell breakpoint is `lg`: below 1024px (phones + tablets) = top header + sheet menu + bottom nav (`MobileNav`, `lg:hidden`, z-40); ≥1024px = shadcn sidebar (`useIsMobile(1024)` in `ui/sidebar.tsx`).
6. **Type Scale:** `text-display` (page h1, fluid), `text-title` (section/card titles), `text-label` (13px meta & stat labels, sentence case), `text-figure` (key money figures, fluid). Add `num` (tabular numerals) to every money/count figure. No tracked-out ALL-CAPS eyebrow labels.
7. **Color & Elevation:** Brand blue `--primary` is `#3f6bf0` (AA-safe shade of the original `#5d87ff`; dark mode uses `#7c9cff` with ink foreground). Text greens use `text-success` (#0a7d6a), never light teal `#13deb9`. Elevation: tonal well `bg-muted/50` (nested groups) → `shadow-card` (resting cards) → `shadow-lift` (menus, hovered *interactive* cards only) → `shadow-overlay` (dialogs/sheets). Radius: controls `rounded-xl`, cards `rounded-2xl`, one feature surface per page `rounded-3xl`.
8. **Motion System (single source of truth in `@theme`):** easings `--ease-in-out` (movement/exits), `--ease-out` (entrances), `--ease-spring-press` / `--ease-spring-pop` / `--ease-spring-soft` (CSS `linear()` damped springs; small elements bounce more, large panels barely overshoot); durations `--motion-fast` 180ms, `--motion-base` 340ms, `--motion-settle` 640ms. Tailwind syntax: `duration-(--motion-fast) ease-(--ease-in-out)`. Buttons get the press spring globally (don't add `active:scale-*`). Use `motion-pop-in` + `--stagger` only for items appearing from user action; `motion-surface` for clickable cards. Animate only transform/opacity (expand/collapse via grid-rows 0fr→1fr); never `transition-all`. Reduced motion is handled globally.

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
- Premium UI/Layout & Motion Pass (`src/app/globals.css`, `src/components/ui/*`, `src/components/Navigation/*`, all dashboard/admin/public pages): Fixed broken/overlapping/squeezed layouts at 375/768/1024/1440 + 200% zoom by moving the app-shell sidebar breakpoint to `lg`, introducing intrinsic `page-header` / `grid-fluid` utilities and `@container/main` container queries, an AA-contrast token pass, a layered dark mode, a fluid type scale, and a single spring-based motion system.

### Recent Changes (Max 5)
1. `[2026-11-09]`: Tenvi Cards & Savings 30s Promo (marketing asset, no app code touched): Built `promo/tenvi-cards-promo/index.html` + `tenvi-cards-promo.mp4` (1080p60). Object-relay concept: a grey BPI card is filled in via the Add credit card form → swatch taps snap card + background through six real `CARD_ACCENTS` and land on Cobalt → Waves/Hex/Contour patterns (the app's `CardPatternOverlay` SVGs) with Contour spilling off the card into the world → BDO + Maya savings cards fan in on mint → card flips to its back, the Nov 18 due chip becomes a countdown calendar on amber → SMS in `DEFAULT_CARD_SMS_TEMPLATE` / `formatCardSummaryItem` wording + `DEFAULT_CARD_EMAIL_*` email → the stack squares off into the `TenviIcon` + "Due dates, handled". Real PH bank names used at the user's request. Also rendered `promo/tenvi-opener/tenvi-opener.mp4`. (Files: `promo/tenvi-cards-promo/index.html`, `promo/tenvi-cards-promo/tenvi-cards-promo.mp4`, `promo/tenvi-opener/tenvi-opener.mp4`, `AGENTS.md`).
2. `[2026-11-09]`: Tenvi 30s Motion Opener (marketing asset, no app code touched): Built `promo/tenvi-opener/index.html`, a single-file GSAP opener (Fraunces claims + Geist UI, autoplay/loop, deterministic timeline, `?debug=1` scrub). Concept: Tenvi AI is asked "Who still owes me?" and answers by acting — owed-to-you list (₱19,500) → tap Remind opens a slate field, SMS (real `DEFAULT_LOAN_SMS_TEMPLATE` wording) + email (`DEFAULT_LOAN_EMAIL_*`) ride an arc to the borrower → "Carlo paid ₱5,000" rides back → "What do I own?" → house/car/lot + OR/CR expiry stamp → one panel flipping Credit cards/Savings/Bill splits/Loans with net worth → camera pulls back and the travel arcs close into the real `TenviIcon` mark + "Personal wealth, unified". Note: `public/images/logos/*.svg` (three-arc logo) is unused template leftover; the opener uses `TenviIcon`. Verified via headless-Chrome contact sheets; tsc, 245/245 tests, check:design pass. (Files: `promo/tenvi-opener/index.html`, `AGENTS.md`).
3. `[2026-11-09]`: Premium UI/Layout & Motion Pass (presentation only — no logic, data, routing or prop changes): Root-caused squeezed/overlapping layouts to the 256px sidebar appearing at 768px while pages used viewport breakpoints; moved the shell to `lg` (`useIsMobile(breakpoint)`, `ui/sidebar.tsx`, dashboard/admin layouts, `TopHeader`, `AdminTopHeader`, `AdminSidebar`, `MobileNav`, `TenviAIChat` trigger) and made page content `@container/main`. Fixed bottom nav (z-50) covering dialogs/onboarding wizard → z-40. Added `page-header`, `page-header-actions`, `grid-fluid(-fill)`, `num`, `motion-pop-in`, `motion-surface` utilities, fluid `text-display/title/label/figure` tokens, `shadow-overlay`, and a `linear()` spring motion system replacing the 1000ms all-property button transition. Contrast pass: primary #5d87ff→#3f6bf0, muted text #7c8fac→#5a6a85, success/danger text tokens AA; dark mode now layered (bg #141b28 < card < popover). Rebuilt MobileNav visuals (transform-only, no gradients/glass), added skip link, Switch off-state boundary, EmptyState/CardBox/StatCard (sentence-case labels, fit-to-card figures). Page polish across dashboard, cards, savings, transactions, splits, loans, receivables, properties, settings, support, admin, landing and auth (sentence case, plurals, wrapping toolbars, tonal wells, removed tracked-caps eyebrows and page-load fades). `npm run check:design` now passes repo-wide (13 failing files → 0; `broadcastTemplate.ts` allowlisted as email HTML). Follow-up: `TailwindTopCards` figures now size to fit their card by character count (`fitFigureSize`, one line, no mid-number breaks at 390px). Verified: 0 horizontal scroll / 0 text overlaps across all routes at 375/512/720/768/1024/1440, dark mode, interaction tests (rapid toggles, Escape, focus return, reduced motion), tsc, 245/245 tests, production build. (Files: `src/app/globals.css`, `src/components/ui/{button,card,StatCard,EmptyState,dialog,alert-dialog,responsive-dialog,sheet,sidebar,switch,progress,theme-toggle}.tsx`, `src/hooks/use-mobile.ts`, `src/components/Navigation/*`, `src/components/shared/CardBox.tsx`, `src/app/dashboard/**`, `src/app/admin/**`, `src/app/page.tsx`, `src/app/(auth)/**`, `src/components/{Dashboard,Cards,Onboarding,Admin,Auth,Settings,Properties}/*`, `src/components/Forms/*`, `design-rules-allowlist.json`, `AGENTS.md`).
4. `[2026-11-07]`: Phase 1 & 2 Security Hardening & Remediation: Implemented immediate zero-risk configuration and privacy remediations from the security audit roadmap. Whitelisted Cloudflare Turnstile domain (`https://challenges.cloudflare.com`) across `script-src`, `frame-src`, and `connect-src` in `next.config.ts`. Added `poweredByHeader: false` to eliminate framework technology fingerprinting. Updated Edge proxy `src/proxy.ts` to terminate unauthenticated `/admin*` requests at the edge before serverless execution. Escaped raw `<` in `src/app/page.tsx` schema markup to eliminate XSS script breakout. Added phone (`+63917****567`) and email (`u***r@domain.com`) masking in `sms.ts` and `email.ts` server logs. Enforced 10MB limit and image/PDF MIME whitelist in `parseReceiptImageAction`. Passed full TypeScript verification, 30 Vitest suites (245/245 tests), and production build. (Files: `next.config.ts`, `src/proxy.ts`, `src/app/page.tsx`, `src/lib/notifications/sms.ts`, `src/lib/notifications/email.ts`, `src/app/actions/receipts.ts`, `AGENTS.md`).
5. `[2026-11-07]`: Defensive Security Audit Skill & Scanner Suite: Built `.agents/skills/security-audit/` with pushy frontmatter description, concise `SKILL.md`, and comprehensive references (`references/owasp_asvs_checklist.md` and `references/vercel_nextjs_checklist.md`). Created executable `scripts/run_scanners.sh` running local package audits and 11 built-in static grep heuristics (secrets, NEXT_PUBLIC_ leaks, unauthenticated Server Actions, cron secrets, XSS sinks, TLS bypasses). Built `scripts/check_headers.py` executing zero-dependency live HTTPS, header, cookie, CORS, and sensitive file exposure tests. Executed initial baseline audit against codebase and `https://tenvi.vercel.app`. (Files: `.agents/skills/security-audit/SKILL.md`, `.agents/skills/security-audit/references/owasp_asvs_checklist.md`, `.agents/skills/security-audit/references/vercel_nextjs_checklist.md`, `scripts/run_scanners.sh`, `scripts/check_headers.py`, `AGENTS.md`).

### Known Issues & Tech Debt
1. **ESLint 9 Flat Config Migration:** `npm run lint` fails because ESLint v9 expects `eslint.config.mjs` (flat configuration) while the project currently lacks the migrated config file.
2. **Sidebar collapse animates width:** shadcn `ui/sidebar.tsx` animates the gap `width` (380ms ease-in-out) when collapsing; content reflows during the transition. Acceptable trade-off; a transform-based rewrite would be needed to remove it.
3. **DashboardTourSpotlight:** highlight still animates position/size (not transform-only), and several `data-tour` targets it references (savings card, cash-flow card, record button) don't exist in the current dashboard markup.
4. **Third-party "Talk to us" voice widget** (`VoiceAgentWidget`, external telli script) renders cramped text in its bubble; styling is inside the vendor script.
5. **Unpolished in the UI pass:** `src/components/Notifications/*` (NotificationTemplatesEditor tabs in settings), `src/components/AI/*` chat panel internals, and modal field labels still in Title Case in cards modals.
6. **Turnstile** needs ≥300px width; on 320px phones it can overflow (compact mode would be a behavior change).

### Next Steps
1. Decide on the brand-blue shift (#5d87ff → #3f6bf0 for WCAG AA) — revert is a one-token change in `globals.css` `:root` if the original shade is preferred.
2. Polish `src/components/Notifications/*` and the AI chat panel internals with the same layout/motion system.
3. Guide user to add `CRON_SECRET` to their Vercel Project Environment Variables so Vercel automated daily cron triggers `/api/cron/notifications` with valid authorization.
4. Promo MP4s are ~100 MB (crf 12, grain-safe); make lighter web copies if needed. Consider deleting the unused template logos in `public/images/logos/`.
5. Keep `/AGENTS.md` updated as the mandatory final step for every subsequent task.
