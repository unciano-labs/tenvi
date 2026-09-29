# Tenvi — Personal Wealth Infrastructure Platform
## Production-Ready MVP Project Plan & Architecture Guide

A next-generation, all-in-one personal wealth infrastructure platform designed to bridge the gap between liquid cash and illiquid assets. Unlike traditional budgeting apps that only sync with credit cards or bank accounts, our platform provides a unified digital ledger that simultaneously tracks daily cash flow, automated savings targets, loan/debt amortization, and real-time property valuations. By bringing a user's entire net worth under a single dashboard, we eliminate financial fragmentation and empower modern asset-builders to optimize their equity, accelerate debt payoff, and grow long-term wealth.

---

## 1. Executive Summary & Core Requirements

### 1.1 The Problem Tenvi Solves
Most personal finance apps suffer from two major flaws:
1. **Disconnected liquid and illiquid wealth**: Traditional budgeting tools only sync with bank accounts or credit cards, ignoring illiquid assets, loan amortization, personal notes, and property equity, leaving users with a fragmented view of their true net worth.
2. **Disconnected shared money tracking**: Apps either track personal spending (Mint/YNAB) OR split bills (Splitwise), but don't connect a shared restaurant bill paid on your credit card directly to your due date, card balance, and who still owes you money.

### 1.2 Tenvi's MVP Value Proposition
Tenvi unifies personal spending, debt optimization, and multi-asset wealth tracking into 4 intuitive modules:
1. **Daily Cash Flow ("Where My Money Went")**: Simple "Money In" (Income) and "Money Out" (Expense) logging with 1-click categories and payment methods (Cash, GCash, Maya, Bank Transfer, Credit Card).
2. **Credit & Debt Amortization ("Don't Get Hit with Late Fees")**: Track cards, credit limits, total spending power, statement cutoff days, and payment due dates with an active countdown (e.g., "Due in 3 days").
3. **Friendly Loans & Receivables ("Money People Owe Me")**: Track money lent to friends or relatives with multi-year amortization schedules, payment recording, and visual progress.
4. **Automated Savings & Asset Equity**: Track dedicated savings vaults, interest targets, and property equity growth under one unified ledger.

### 1.3 Key Constraints & Design Directives
- **Multi-Tenancy Foundation**: Bili runs within the multi-tenant Supabase ecosystem. All tables use the `bili_` prefix and require `website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953'`. Default website role is `user` (`02bf8818-b503-4f94-beac-6c45aa12e368`).
- **Non-Techy UI/UX**: Plain everyday language, big touchable buttons, zero financial jargon, intuitive icons, and instant visual clarity.
- **Strict Anti-AI Design Rules**:
  - ❌ **NEVER use gradients** (no `bg-gradient-to-*`, no multi-color faded backgrounds).
  - ❌ **NEVER use borders** (no `border`, `border-gray-*`, `border-t/b/l/r` dividing lines or card outlines).
  - ✅ **Depth via Tonal Contrast**: Separation achieved exclusively through subtle background tint shifts (e.g., soft canvas `bg-slate-100/70` vs crisp solid card `bg-white`), organic soft elevation (`shadow-sm`, `shadow-[0_2px_8px_rgba(0,0,0,0.04)]`), and generous padding.

---

## 2. Technology Stack & Architecture Decisions

Adopted directly from `MVP_ARCHITECTURE_REF.md` to ensure professional, maintainable, and secure standards from Day 1:

| Layer | Choice | Version / Standard | Why Adopted from Architecture Reference |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 15.x / 16.x | Server Components for instant data loading; Server Actions for secure mutations |
| **Language** | TypeScript | 5.x (`strict: true`) | Eliminates runtime type errors, ensures robust interfaces |
| **Styling** | Tailwind CSS | 4.x | Utility tokens, strict no-border / no-gradient rules enforced via custom utility classes |
| **Database & Auth** | Supabase (PostgreSQL) | Managed Cloud | Relational integrity, Row Level Security (RLS) on every table, cookie-based session auth |
| **SSR Auth Client** | `@supabase/ssr` | Latest | Separate context-specific clients (Server Components, Server Actions, Middleware, Browser) |
| **Validation** | Zod | 3.x / 4.x | Single source of truth for runtime validation and static TypeScript types |
| **Forms** | `react-hook-form` + `@hookform/resolvers/zod` | Latest | High performance form state with Zod schema parity |
| **Feedback & Notifications** | `sonner` | Latest | Accessible, lightweight toast notifications for immediate user feedback |
| **Icons** | `lucide-react` | Latest | Single cohesive iconography set across all modules |
| **Number & Date Math** | Pure Facade Helper Functions | UTC-anchored | Single source of truth for calculations (due dates, loan repayments, bill splits) |

---

## 3. Architecture Patterns Adopted from `MVP_ARCHITECTURE_REF.md`

### 3.1 Adopted for MVP

1. **Context-Specific Database Client Factories**:
   - `lib/supabase/server.ts`: Server components & Server Actions (reads/writes respecting RLS via cookies).
   - `lib/supabase/client.ts`: Browser client for reactive UI and realtime subscriptions.
   - `lib/supabase/middleware.ts`: Route protection and token refresh.
   - `SUPABASE_SERVICE_ROLE_KEY` is strictly server-only for admin tasks or system seeds; never exposed to client bundles.

2. **Server Action Mutation Pattern (5-Step Guard)**:
   Every data mutation follows the architecture reference standard:
   ```
   1. requireSession(supabase)                           → Authenticate user
   2. assertWebsiteScope(WEBSITE_ID)                     → Verify tenant scope
   3. schema.parse(formData)                             → Validate inputs with Zod
   4. .eq('website_id', WEBSITE_ID).eq('user_id', user.id) → Scoped database write
   5. revalidatePath('/dashboard/...')                   → Invalidate cache & return typed result
   ```

3. **Multi-Tenancy with `website_id` & `bili_` Prefix**:
   - All tables share the Supabase instance safely alongside other apps (`invoicer`, `parmasi`, `denti`) using the `bili_` prefix.
   - Every row contains `website_id uuid not null references websites(id)`.
   - Bili Website ID: `65d4f86e-1829-417a-981f-bc7aad7bc953`.
   - Default Website Role: `user` (`02bf8818-b503-4f94-beac-6c45aa12e368`).

4. **Single Source of Truth for Calculations (Calculation Facades)**:
   - Centralized in `src/lib/finance/calculations.ts`.
   - Card due dates: exact calculation of days remaining, current billing cycle, overdue status.
   - Loan math: balance remaining, repayment progress percentage, status updates (`unpaid`, `partial`, `paid`).
   - Split math: cent-safe equal distribution with rounding remainder distribution so sum of shares always equals total bill.

5. **Data Architecture & Precision**:
   - All money columns use `numeric(12, 2)` (never floats).
   - All timestamps stored in `timestamptz` (UTC). Formatted for display in client's local timezone.
   - Default currency is Philippine Peso (`₱` / PHP), formatted with standard comma grouping.

### 3.2 Deliberately Deferred (Post-MVP)
To maintain a fast, focused MVP launch without premature complexity:
- Multi-tier Stripe subscription billing (deferred to Post-MVP).
- Granular ~100-capability RBAC matrix (using standard `user` role for MVP).
- Realtime WebSocket job queues / Inngest (synchronous Server Actions are sufficient for MVP transaction volumes).
- Multi-locale i18n (single clear English interface with Philippine financial contexts).

---

## 4. Multi-Tenant Database Model (PostgreSQL / Supabase DDL)

All tables use `bili_` prefix, foreign key to `websites(id)`, and have Row Level Security (RLS) enabled.

```sql
-- 1. Contacts (People you lend money to or split bills with)
create table public.bili_contacts (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Expense / Income Categories
create table public.bili_categories (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'Tag',
  color text not null default '#0F172A',
  kind text not null check (kind in ('expense', 'income')),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. Credit Cards & Due Dates
create table public.bili_credit_cards (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank_name text not null,
  last_4 text not null check (length(last_4) = 4),
  credit_limit numeric(12, 2) not null default 0,
  statement_day integer not null check (statement_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  color_theme text not null default 'slate',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Transactions (Daily Incomes & Expenses)
create table public.bili_transactions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.bili_categories(id) on delete set null,
  payment_method text not null check (payment_method in ('cash', 'credit_card', 'debit_card', 'gcash', 'maya', 'bank_transfer')),
  credit_card_id uuid references public.bili_credit_cards(id) on delete set null,
  loan_id uuid references public.bili_loans(id) on delete set null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Personal Loans & Installments (Money Lent to Others)
create table public.bili_loans (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.bili_contacts(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  balance_remaining numeric(12, 2) not null check (balance_remaining >= 0),
  status text not null check (status in ('unpaid', 'partial', 'paid')) default 'unpaid',
  reason text,
  loaned_on date not null default current_date,
  due_date date,
  is_installment boolean not null default false,
  installment_months integer check (installment_months in (3, 6, 12, 24, 36, 48, 60)),
  monthly_due_day integer check (monthly_due_day between 1 and 31),
  monthly_amount numeric(12, 2),
  credit_card_id uuid references public.bili_credit_cards(id) on delete set null,
  downpayment_amount numeric(12, 2) not null default 0.00,
  downpayment_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5b. Loan Installments (Monthly amortized schedule breakdown)
create table public.bili_loan_installments (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.bili_loans(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  is_paid boolean not null default false,
  paid_on date,
  payment_method text default 'cash',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Loan Repayments (Partial or full payments against a loan)
create table public.bili_loan_payments (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.bili_loans(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method text not null default 'cash',
  paid_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- 7. Bill Splits (Shared card or cash purchases)
create table public.bili_bill_splits (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  credit_card_id uuid references public.bili_credit_cards(id) on delete set null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Split Participants (Who owes what for a split)
create table public.bili_split_participants (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  split_id uuid not null references public.bili_bill_splits(id) on delete cascade,
  contact_id uuid not null references public.bili_contacts(id) on delete cascade,
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  is_paid boolean not null default false,
  paid_on date,
  payment_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Notification Settings (Email & SMS preferences per user)
create table public.bili_notification_settings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notify_email boolean not null default true,
  email_address text,
  notify_sms boolean not null default false,
  phone_number text,
  days_before integer not null default 3 check (days_before between 1 and 14),
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_bili_notification_settings_user unique (website_id, user_id)
);

-- 10. Notification Logs (Audit history & Once-a-day enforcement)
create table public.bili_notification_logs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  card_names text not null,
  message_body text not null,
  status text not null check (status in ('sent', 'simulated', 'failed')) default 'sent',
  sent_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Indexes for high-performance scoped lookups
create index idx_bili_contacts_scope on public.bili_contacts(website_id, user_id);
create index idx_bili_notification_logs_daily on public.bili_notification_logs(website_id, user_id, channel, sent_date);
create index idx_bili_categories_scope on public.bili_categories(website_id, user_id);
create index idx_bili_credit_cards_scope on public.bili_credit_cards(website_id, user_id);
create index idx_bili_transactions_scope on public.bili_transactions(website_id, user_id, occurred_on desc);
create index idx_bili_transactions_loan on public.bili_transactions(loan_id);
create index idx_bili_loans_scope on public.bili_loans(website_id, user_id, status);
create index idx_bili_loans_card on public.bili_loans(credit_card_id);
create index idx_bili_loan_installments_scope on public.bili_loan_installments(website_id, user_id, loan_id);
create index idx_bili_loan_payments_scope on public.bili_loan_payments(website_id, user_id, loan_id);
create index idx_bili_bill_splits_scope on public.bili_bill_splits(website_id, user_id, occurred_on desc);
create index idx_bili_split_participants_scope on public.bili_split_participants(website_id, user_id, split_id);
create index idx_bili_categories_scope on public.bili_categories(website_id, user_id);
create index idx_bili_credit_cards_scope on public.bili_credit_cards(website_id, user_id);
create index idx_bili_transactions_scope on public.bili_transactions(website_id, user_id, occurred_on desc);
create index idx_bili_loans_scope on public.bili_loans(website_id, user_id, status);
create index idx_bili_loan_payments_scope on public.bili_loan_payments(website_id, user_id, loan_id);
create index idx_bili_bill_splits_scope on public.bili_bill_splits(website_id, user_id, occurred_on desc);
create index idx_bili_split_participants_scope on public.bili_split_participants(website_id, user_id, split_id);

-- Row Level Security (RLS) Policies on all tables
alter table public.bili_contacts enable row level security;
alter table public.bili_categories enable row level security;
alter table public.bili_credit_cards enable row level security;
alter table public.bili_transactions enable row level security;
alter table public.bili_loans enable row level security;
alter table public.bili_loan_payments enable row level security;
alter table public.bili_bill_splits enable row level security;
alter table public.bili_split_participants enable row level security;

-- Policy template applied to each table:
create policy "bili_contacts_user_isolation" on public.bili_contacts
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);

create policy "bili_categories_user_isolation" on public.bili_categories
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);

create policy "bili_credit_cards_user_isolation" on public.bili_credit_cards
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);

create policy "bili_transactions_user_isolation" on public.bili_transactions
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);

create policy "bili_loans_user_isolation" on public.bili_loans
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);

create policy "bili_loan_payments_user_isolation" on public.bili_loan_payments
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);

create policy "bili_bill_splits_user_isolation" on public.bili_bill_splits
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);

create policy "bili_split_participants_user_isolation" on public.bili_split_participants
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);
```

---

## 5. UI/UX System Specification: Non-Techy & Anti-AI Design

### 5.1 Strict Anti-AI Design Rules
Generic AI-generated websites rely on two repetitive tropes:
1. Bright, unnatural CSS gradients (`from-indigo-500 via-purple-500 to-pink-500`).
2. Heavy thin lines and boxes everywhere (`border border-slate-200`, `border-b`, `divide-y`).

**Bili completely eliminates both:**
- 🚫 **No Gradients Anywhere**: All surfaces use solid, deliberate, calming colors.
- 🚫 **No Borders Anywhere**: Cards, tables, lists, inputs, and modals have **zero border strokes**.

### 5.2 How Separation & Hierarchy Are Created Without Borders
1. **Tonal Background Hierarchy**:
   - Page Canvas: Warm, soft pearl/slate background (`bg-[#F6F7F9]`).
   - Cards & Containers: Crisp, solid white (`bg-white`).
   - Inner Inset Sections: Subtle tinted pill surfaces (`bg-slate-100/80` or `bg-slate-50`).
2. **Organic Soft Elevation**:
   - Clean, diffused drop shadows that make cards float naturally above the canvas:
     `shadow-[0_2px_12px_rgba(0,0,0,0.03)]` and hover elevation `shadow-[0_8px_24px_rgba(0,0,0,0.06)]`.
3. **Generous Spacing & Visual Rhythm**:
   - Clear distinction between sections using 24px-32px gaps (`gap-6`, `space-y-6`) and rounded corners (`rounded-2xl` and `rounded-xl`).
4. **Color Language with Solid Tones**:
   - **Primary Action**: Solid Deep Slate (`bg-slate-900 text-white hover:bg-slate-800`).
   - **Money In (Income)**: Solid Soft Emerald (`bg-emerald-50 text-emerald-700`).
   - **Money Out (Expense)**: Solid Soft Rose (`bg-rose-50 text-rose-700`).
   - **Due Date Warning (< 5 Days)**: Solid Warm Amber (`bg-amber-50 text-amber-800`).
   - **Due Date Critical (< 2 Days / Overdue)**: Solid Bold Coral (`bg-red-50 text-red-700`).
   - **Neutral Chips & Tags**: Solid Slate (`bg-slate-100 text-slate-700`).

### 5.3 Non-Techy Language Dictionary
Every piece of text in Bili is phrased the way an everyday person talks about money:

| Tech / Accounting Jargon | Bili Human-Friendly Replacement |
|---|---|
| Debit / Expense | **Money Out** |
| Credit / Income | **Money In** |
| Accounts Receivable | **People Who Owe You** |
| Accounts Payable / Due Dates | **Bills Coming Up** |
| Split Participant Amortization | **Who's Chipping In?** |
| Payment Status: Settled | **All Paid Up ✅** |
| Payment Status: Outstanding | **Still Needs to Pay** |
| Statement Closing Date | **Cutoff Day** |
| Payment Due Date | **Pay By Day** |
| Record Transaction | **Add an Expense / Income** |

---

## 6. MVP Project Structure (`src/` Architecture)

```
Bili/
├── .env.local                          # Supabase, Website ID, Role ID, PayMongo keys
├── package.json                        # Next.js 15/16, React 19, Tailwind v4, Zod, Sonner
├── tsconfig.json                       # strict: true, noUncheckedIndexedAccess: true
├── PROJECT_PLAN.md                     # This plan
├── MVP_ARCHITECTURE_REF.md             # Cleaned reference guide
├── supabase/
│   ├── migrations/
│   │   └── 20260927_bili_core_schema.sql # DDL, Indexes, RLS for all bili_* tables
│   └── seed.sql                        # Default categories & initial test data
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout, fonts, Sonner toaster
│   │   ├── globals.css              │   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # Clean, friendly login
│   │   │   └── register/page.tsx       # 3-field simple registration
│   │   └── dashboard/
│   │       ├── layout.tsx              # Sidebar / mobile bottom nav shell
│   │       ├── page.tsx                # Financial snapshot: spending, upcoming bills, owed money
│   │       ├── transactions/
│   │       │   ├── page.tsx            # Full log with quick filter pills & quick add
│   │       │   └── TransactionsClient.tsx # Traceable feed with direct loan linkages
│   │       ├── cards/
│   │       │   ├── page.tsx            # Credit cards, due dates countdown, statement tracker
│   │       │   └── CardsClient.tsx     # Physical card visual with custom colors & "Swiped for Others"
│   │       ├── loans/
│   │       │   ├── page.tsx            # Friends & family loans, repayment logger, owed tally
│   │       │   ├── LoansClient.tsx     # Clickable cards with installment & card badges
│   │       │   └── [id]/
│   │       │       ├── page.tsx        # Server component fetching parent loan, installments & transactions
│   │       │       └── LoanDetailsClient.tsx # Full monthly schedule table, 1-click paid toggles & audit ledger
│   │       ├── savings/
│   │       │   ├── page.tsx            # Cash & savings accounts overview
│   │       │   └── SavingsClient.tsx   # Traditional banks, high-yield digital banks, cash on hand
│   │       ├── splits/
│   │       │   ├── page.tsx            # Group bill splitting on credit card with 1-tap paid toggles
│   │       │   └── SplitsClient.tsx    # Split breakdown and participant payment status
│   │       ├── settings/
│   │       │   ├── page.tsx            # Server component fetching notification settings, logs & cards
│   │       │   └── SettingsClient.tsx  # Email/SMS alerts toggle, nominated mobile number, schedule & history
│   │       └── api/
│   │           └── cron/
│   │               └── notifications/
│   │                   └── route.ts    # Daily cron endpoint enforcing once-a-day alert dispatch
│   ├── app/actions/                    # Server Actions (Zod-validated, auth-checked mutations)
│   │   ├── auth.ts                     # Login, register, logout, profile link
│   │   ├── transactions.ts             # Create, delete, filter transactions
│   │   ├── cards.ts                    # Add card, edit due dates, custom colors, delete card
│   │   ├── loans.ts                    # Create installment loans, toggle installments, record repayments
│   │   ├── savings.ts                  # Deposit, withdraw, adjust savings balances
│   │   ├── splits.ts                   # Create bill split, toggle participant paid status
│   │   └── notifications.ts            # Save alert preferences, evaluate due dates, once-a-day dispatch & tests
│   ├── components/
│   │   ├── Navigation/
│   │   │   ├── Sidebar.tsx             # Desktop navigation (clean, borderless)
│   │   │   └── MobileNav.tsx           # Bottom bar for non-techy mobile users
│   │   ├── UI/                         # Borderless, gradient-free primitives
│   │   │   ├── StatCard.tsx            # Floating metric card with icon & soft tint
│   │   │   ├── StatusBadge.tsx         # Pill badge for Paid / Due / Overdue
│   │   │   ├── MoneyDisplay.tsx        # Formatted ₱ currency with integer/cents styling
│   │   │   └── EmptyState.tsx          # Friendly illustration + helpful suggestion
│   │   ├── Forms/
│   │   │   ├── TransactionModal.tsx    # Large touchable type switcher, amount input
│   │   │   ├── CreditCardModal.tsx     # PH bank dropdown, custom color picker & live preview
│   │   │   ├── LoanModal.tsx           # Installment terms (3-60 mos), due day, downpayment, card link
│   │   │   ├── LoanPaymentModal.tsx    # Ad-hoc custom repayment logger with quick "Pay in Full"
│   │   │   ├── SavingsModal.tsx        # Account balance & institution creator
│   │   │   └── BillSplitModal.tsx      # Dynamic friend chip selector + auto-division
│   │   └── Providers/
│   │       └── ToasterProvider.tsx     # Sonner toast provider for instant feedback
│   ├── lib/
│   │   ├── constants.ts                # WEBSITE_ID, DEFAULT_ROLE_ID, PH banks, installment terms
│   │   ├── supabase/
│   │   │   ├── server.ts               # Server Component & Server Action client
│   │   │   ├── client.ts               # Client Component browser client
│   │   │   └── middleware.ts           # Cookie refresh & session guard
│   │   ├── finance/
│   │   │   └── calculations.ts         # Pure calculations: due dates, cent-safe schedules, loan math
│   │   └── validations/
│   │       └── schemas.ts              # Zod schemas for all forms & actions
│   ├── types/
│   │   └── index.ts                    # TypeScript types derived from Zod & DB schemas
│   └── proxy.ts                        # Next.js 16 proxy replacing deprecated middleware
```

---

## 7. Step-by-Step MVP Implementation Roadmap

### Phase 1: Database Migration & Multi-Tenant Setup (Completed)
- [x] Create `websites` table row for `Bili` (ID: `65d4f86e-1829-417a-981f-bc7aad7bc953`).
- [x] Create `website_roles` row with role `user` (ID: `02bf8818-b503-4f94-beac-6c45aa12e368`).
- [x] Configure `.env.local` with `WEBSITE_ID` and `DEFAULT_ROLE_ID`.
- [x] Run migration `20260927_bili_core_schema.sql` on Supabase to create all `bili_*` tables, indexes, and RLS policies.
- [x] Run migration `20260927_bili_savings_schema.sql` for Savings & Cash accounts with RLS.
- [x] Run migration `20260927_bili_loan_installments_schema.sql` for monthly installment schedules.
- [x] Run migration `20260927_bili_loan_downpayment_and_card.sql` for downpayment, card linking, and transaction traceability.
- [x] Seed default categories (Groceries, Dining Out, Commute & Gas, Electric & Water, Shopping, Health, Salary, Side Gig).

### Phase 2: Project Initialization & Core Framework (Completed)
- [x] Scaffold Next.js App Router project with TypeScript and Tailwind CSS v4.
- [x] Configure `globals.css` with borderless, gradient-free design tokens.
- [x] Implement `@supabase/ssr` client factories in `src/lib/supabase/`.
- [x] Implement Next.js 16 `src/proxy.ts` for session handling and `/dashboard` route protection.
- [x] Setup `src/lib/finance/calculations.ts` with pure math functions (due date, loan status, split shares, cent-safe installment schedules).

### Phase 3: Authentication & User Onboarding (Completed)
- [x] Build `/login` and `/register` with human, friendly language and instant validation.
- [x] Automatically link new users to `user_profiles` and assign `website_role` (`user`).
- [x] Auto-seed default user categories upon first sign-in.

### Phase 4: Core Module Implementation (Completed)
- [x] **Overview Dashboard (`/dashboard`)**:
  - Total Savings & Cash combined metric.
  - Net monthly snapshot: Total Money In vs Total Money Out.
  - "Bills Due Soon" alert bar highlighting credit cards due within 5 days.
  - "People Who Owe You" summary card (total loans + unpaid splits).
  - Quick action floating buttons for fast logging.
- [x] **Savings & Cash Module (`/dashboard/savings`)**:
  - Track traditional banks (BDO, BPI, Metrobank, UnionBank, Security Bank, RCBC, etc.).
  - Track high-yield digital banks (Maya Savings, CIMB Bank, MariBank, GoTyme, SeaBank, Tonik, OwnBank).
  - Track cash on hand / physical envelopes and e-wallets (GCash, Maya).
  - Target savings goal progress bar & interest rate indicators.
  - 1-click Quick Deposit / Withdraw / Adjust Balance modal.
- [x] **Transactions Module (`/dashboard/transactions`)**:
  - Add transaction modal with prominent "Money Out" / "Money In" toggle.
  - Category selector with friendly colored icon tiles.
  - Payment method selector (Cash, GCash, Maya, Credit Card).
  - Chronological transaction feed with date headers and category icons.
  - Interactive direct linkage badge to loan details page (`Loan: [Borrower] →`).
- [x] **Credit Card Watcher (`/dashboard/cards`)**:
  - Total Spending Power combined metric, Active Cards in Wallet count, and Available Spending Power stat row.
  - Curated dropdown of Philippine banks offering credit cards (BDO, BPI, Metrobank, UnionBank, Security Bank, RCBC, PNB, EastWest, etc.).
  - Interactive Custom Color Picker with preset solid swatches, native color wheel/eyedropper, and live reactive card preview.
  - "Swiped for Others" card breakdown showing total amount swiped, remaining balances, available spending power per card, and direct links to loan details.
  - Statement cutoff day, payment due day, credit limit / spending power, and active countdown badge.
- [x] **Friendly Loans & Installments Module (`/dashboard/loans` & `/dashboard/loans/[id]`)**:
  - Choice between Flexible / One-Time repayment and Monthly Installments.
  - Selectable installment terms: **3, 6, 12, 24, 36, 48, 60 Months** with custom due day (1-31).
  - Upfront downpayment tracking with automatic net financed balance calculation.
  - Credit card purchase linking ("which card purchased the loan/installment").
  - Dedicated Loan Details & Schedule page (`/dashboard/loans/[id]`) rendering every month until completion.
  - 1-click "Mark as Paid" and "Undo" actions per month with optimistic UI and parent balance recalculation.
  - Full financial activity audit ledger displaying all linked card expenses, downpayment income, and installment repayments.
- [x] **Bill Splits Module (`/dashboard/splits`)**:
  - Create bill split linked to a credit card (e.g. "Dinner with Team").
  - Add friends and auto-divide total evenly (or custom amount).
  - 1-tap "Mark Paid / Tap when paid" toggle per person with instant balance update.
- [x] **Settings & Automated Bill Alerts Module (`/dashboard/settings`)**:
  - Email and SMS notification toggles with persistent user preferences in `bili_notification_settings`.
  - Nominated mobile phone number support (Philippine formats `09XX` / `+639XX`).
  - Automated once-a-day schedule trigger 3 days before credit card payment due dates.
  - Multi-card consolidation: If 3 cards are due within 3 days, consolidated SMS/Email is dispatched once each day.
  - Test alert dispatchers with real-time verification and audit history in `bili_notification_logs`.
  - Daily cron background worker at `/api/cron/notifications`.

### Phase 5: Polish & Quality Assurance (Completed)
- [x] Verify 100% absence of borders and gradients across all components.
- [x] Verify responsive desktop sidebar and mobile bottom navigation.
- [x] Verify multi-tenant RLS isolation on Supabase.
- [x] Zero-error TypeScript compilation and Turbopack production build (`npm run build`).

---

## 8. Process & Architectural Changelog (Completed Enhancements)

This section provides a complete, chronological record of requirements, architectural decisions, and technical implementations executed across the system:

### 8.1 Installment Amortization Engine & Schedule Tracking
- **User Requirement**: Enable loans to be configured as monthly installments with selectable terms (3, 6, 12, 24, 36, 48, 60 months) and monthly due days. Clicking a loan navigates to a dedicated page displaying the complete schedule until loan completion, with 1-click "Mark as Paid" functionality.
- **Database Architecture**:
  - Added to `bili_loans`: `is_installment`, `installment_months`, `monthly_due_day`, `monthly_amount`.
  - Created `bili_loan_installments` table with columns: `id`, `website_id`, `user_id`, `loan_id`, `installment_number`, `due_date`, `amount`, `is_paid`, `paid_on`, `payment_method`, `note`.
  - Configured RLS user isolation policies and performance indexes.
- **Cent-Safe Schedule Generation**:
  - Implemented `generateInstallmentSchedule` and `calculateSplitShares` in `src/lib/finance/calculations.ts`.
  - Prevents floating-point rounding errors by converting to integer cents, computing base share, and distributing remainder cents across the first installments.
  - Implemented calendar month due-day clamping (e.g., day 31 automatically clamps to day 28/29 in February, 30 in April/June/Sept/Nov).
- **Dedicated Route (`/dashboard/loans/[id]`)**:
  - Server Component [src/app/dashboard/loans/\[id\]/page.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/%5Bid%5D/page.tsx) securely fetches the parent loan, contacts, installments, and linked transactions.
  - Automatically verifies and auto-generates missing installment records on the server if `is_installment` is true but records are absent.
  - Client Component [src/app/dashboard/loans/\[id\]/LoanDetailsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/%5Bid%5D/LoanDetailsClient.tsx) renders the full payment schedule table from Month 1 to Month N (e.g. 24 records for a 24-month loan) showing exact due dates, cent-safe monthly shares, and live payment status.
  - For unconfigured loans, an interactive setup card allows 1-click generation of the full payment schedule (3, 6, 12, 24, 36, 48, 60 months).
  - An inline "Change Term / Reconfigure" drawer enables users to switch terms or adjust monthly due days at any time, instantly regenerating records.
  - 1-click "Mark as Paid" and "Undo" buttons trigger `toggleLoanInstallmentPaidAction`, which atomically updates the installment, re-derives `balance_remaining` from unpaid installments, updates loan status (`unpaid`, `partial`, `paid`), and logs traceable transaction entries.

---

### 8.2 Downpayment Processing & Upfront Equity
- **User Requirement**: Support downpayments for loans (e.g., borrower contributes cash upfront for a phone or appliance).
- **Database Architecture**:
  - Added `downpayment_amount numeric(12,2) DEFAULT 0.00` and `downpayment_paid boolean DEFAULT false` to `bili_loans`.
- **Amortization & Schedule Logic**:
  - When a downpayment is entered, the net amount to be amortized is computed as `amountToFinance = amount - downpayment`.
  - Installment monthly schedule is generated strictly for `amountToFinance`.
  - The parent loan's initial `balance_remaining` is set to `amountToFinance`, and its status is initialized to `partial` (or `paid` if downpayment covers the full cost).
  - Downpayment is recorded in `bili_loan_payments` with note `'Initial Downpayment'`.
  - The loan details view displays a prominent downpayment badge and breakdown card showing total cost, upfront downpayment paid, and net financed balance.

---

### 8.3 Credit Card Linking & "Swiped for Others" Integration
- **User Requirement**: Connect loans to the specific credit card that was used to make the purchase.
- **Database Architecture**:
  - Added `credit_card_id uuid REFERENCES public.bili_credit_cards(id) ON DELETE SET NULL` to `bili_loans`.
- **User Experience**:
  - In [LoanModal.tsx](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/LoanModal.tsx), users can select from their active credit cards (with issuing bank and last 4 digits).
  - Selecting a card displays an automated notice that the expense will be attributed to that card.
  - In [LoansClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/LoansClient.tsx) and [LoanDetailsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/%5Bid%5D/LoanDetailsClient.tsx), cards show a dedicated "Purchased via Credit Card" highlight card with card theme and direct link to card statements.
  - In [CardsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/cards/CardsClient.tsx), each card features a **"Swiped for Others"** section summarizing all active loans purchased on that card with remaining balances and direct links to each loan detail page.

---

### 8.4 End-to-End Financial Traceability & Audit Ledger
- **User Requirement**: Ensure all transactions linked to loans and card purchases are fully traceable across the system.
- **Database Architecture**:
  - Added `loan_id uuid REFERENCES public.bili_loans(id) ON DELETE SET NULL` to `bili_transactions`.
- **Ledger Synchronization**:
  1. **Credit Card Swipe**: Creates an `expense` transaction under `bili_transactions` with `credit_card_id` and `loan_id`, titled `Card purchase for [Borrower] ([Reason])`.
  2. **Upfront Downpayment**: Creates an `income` transaction under `bili_transactions` with `loan_id` and payment method, titled `Downpayment received from [Borrower]`.
  3. **Installment Repayments**: Marking an installment as paid automatically creates an `income` transaction titled `Repayment from [Borrower] - Month #[N]`. Undoing the payment cleanly deletes the matching transaction.
  4. **Ad-Hoc Repayments**: Logging a custom payment in `recordLoanPaymentAction` logs both a payment record and an `income` transaction.
  5. **Loan Details Activity Ledger**: [LoanDetailsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/%5Bid%5D/LoanDetailsClient.tsx) displays a live **"Traceable Activity & Ledger"** timeline showing every card expense, downpayment, and repayment.
  6. **Transactions Feed Linkage**: [TransactionsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/transactions/TransactionsClient.tsx) renders a direct clickable badge on every loan-tied transaction: `Loan: [Borrower] →`.

---

### 8.5 Interactive Custom Color Picker for Credit Cards
- **User Requirement**: Add custom color picker for cards.
- **Features & Enhancements**:
  - Replaced hardcoded keyword styles with dynamic hex color support across [CreditCardModal.tsx](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/CreditCardModal.tsx) and [CardsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/cards/CardsClient.tsx).
  - Added 8 curated solid luxury card presets: Charcoal Black (`#0F172A`), Royal Navy (`#1E3A8A`), Forest Emerald (`#065F46`), Burgundy Crimson (`#9F1239`), Bronze Amber (`#92400E`), Imperial Purple (`#581C87`), Deep Teal (`#0F766E`), Graphite Slate (`#334155`).
  - Added native interactive Color Picker (`<input type="color" ... />`) and direct Hex Code input (`#1E293B`).
  - Added a **Live Physical Card Preview** right inside the modal that updates in real time with the chosen color, bank name, card nickname, last 4 digits, and credit limit.

---

### 8.6 Strict Anti-AI Design & Human-Centric UX Compliance
- **Zero CSS Gradients**: Strictly zero `bg-gradient-*` classes across the entire codebase.
- **Zero Border Lines**: Strictly zero `border`, `border-*`, `divide-*` lines.
- **Contrast & Depth**: Depth achieved exclusively via soft canvas background (`bg-[#F6F7F9]`) vs crisp solid white cards (`bg-white`) and subtle elevation (`shadow-sm`, `shadow-md`).
- **Human-Friendly Language**: Plain language throughout (*"Money In & Money Out"*, *"People Who Owe You"*, *"Swiped for Others"*, *"Downpayment Paid Upfront"*, *"Mark as Paid"*).

---

### 8.7 Spending Power & Card Count Metrics
- **User Requirement**: In credit cards, display total spending power and how many cards the user has.
- **Features & Enhancements**:
  - Added a responsive 3-column summary stat row at the top of `/dashboard/cards`:
    1. **Total Spending Power**: Computes the combined credit limit across all active cards using `formatMoney`.
    2. **Cards in Wallet**: Displays the exact active card count and lists the issuing banks.
    3. **Available Spending Power**: Automatically calculates free credit line after deducting active "Swiped for Others" loan balances.
  - Updated physical card visual representations:
    - Card preview and grid cards now explicitly label card credit lines as **"Spending Power"**.
    - If a card has active linked loans swiped on it, a dedicated pill displays **"Available on this Card"** showing the net remaining limit for that specific card.
    - Modal input now clearly reads **"Spending Power / Credit Limit (PHP) - Optional"**.

---

### 8.8 Automated Credit Card Due Bill Notifications (Email & SMS)
- **User Requirement**: In settings, notify through Email or SMS. The user can nominate a mobile phone number to send alerts. Reminders are triggered once a day, 3 days before the payment due date. If there are 3 upcoming due dates, send SMS once each day with consolidated details.
- **Database Architecture**:
  - `bili_notification_settings`: Stores user preferences (`notify_email`, `email_address`, `notify_sms`, `phone_number`, `days_before`, `last_notified_at`).
  - `bili_notification_logs`: Records all dispatched notifications with recipient, card names, message body, status, and `sent_date` to strictly enforce the once-a-day rule per channel.
- **Notification Scheduling & Consolidation Logic**:
  - Evaluates active cards using `calculateNextDueDate`.
  - Filters cards with `daysRemaining >= 0 && daysRemaining <= days_before` (default 3 days).
  - Queries `bili_notification_logs` to ensure no alert has already been sent on the current calendar date (`sent_date = todayStr`).
  - Consolidates all cards due within the 3-day window into a single comprehensive daily message (preventing SMS spam).
  - Next day, as the calendar advances, the system checks again and dispatches the updated daily reminder.
- **UI & Controls**:
  - Dedicated `/dashboard/settings` route with borderless, gradient-free controls.
  - "Send Test SMS" and "Send Test Email" buttons to verify delivery instantly.
  - Live "Cards in Due Window" widget with 1-click "Send Today's Reminder Now" trigger.
  - Notification history audit ledger displaying timestamps, channels, recipients, and message snippets.
  - Direct call-to-action banner on `/dashboard/cards` linking to notification settings.

---

### 8.9 Full Payment Schedule Table Until End of Loan
- **User Requirement**: For loan details, there must be a table of the payment schedule until the end of the loan (e.g. 24 months = 24 records).
- **Implementation**:
  - [LoanDetailsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/%5Bid%5D/LoanDetailsClient.tsx) renders all records from Month 1 to Month N sequentially in a responsive list/table with status badges (`Settled`, `Due Today`, `Due Tomorrow`, `Due in X days`, `Overdue by X days`).
  - Automatically verifies and auto-generates missing records in `LoanDetailPage` if an installment loan was recorded without child records.
  - Allows full re-configuration of terms (3, 6, 12, 24, 36, 48, 60 months) with immediate database synchronization.
  - 1-click "Mark as Paid" and "Undo" buttons provide instant balance and transaction audit reconciliation.

---

### 8.10 Borrower Email & Mobile Number for Automated 3-Day Loan Notifications
- **User Requirement**: Add email and number to loan so it can send notification 3 days until due date.
- **Database Architecture**:
  - Applied migration `20260927_bili_loan_borrower_contact.sql`:
    ```sql
    ALTER TABLE public.bili_loans
    ADD COLUMN IF NOT EXISTS borrower_phone text,
    ADD COLUMN IF NOT EXISTS borrower_email text,
    ADD COLUMN IF NOT EXISTS notify_borrower boolean not null default true;

    ALTER TABLE public.bili_notification_logs
    ALTER COLUMN card_names DROP NOT NULL;

    ALTER TABLE public.bili_notification_logs
    ADD COLUMN IF NOT EXISTS loan_id uuid references public.bili_loans(id) on delete set null;
    ```
- **Creation & Contact Synchronization**:
  - In [LoanModal.tsx](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/LoanModal.tsx):
    - Added dedicated **"Automated Reminders (3 Days Before Due)"** section with Mobile Number (SMS) and Email Address input fields and an active notification switch.
    - Selecting an existing contact automatically auto-fills their phone and email if already saved.
    - Recording a loan updates both the loan record and syncs back to `bili_contacts`.
- **Loan Details Management & Manual Trigger**:
  - In [LoanDetailsClient.tsx](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/loans/%5Bid%5D/LoanDetailsClient.tsx):
    - Added a **"Borrower Contact & Automated Reminders"** overview card.
    - Displays borrower mobile phone, email address, next scheduled alert (next unpaid installment due date and amount), and active notification status badge (`🔔 3 Days Before Due Active` / `🔕 Reminders Paused`).
    - Inline contact editor allowing instant editing of phone, email, and toggle notifications at any time via `updateLoanBorrowerContactAction`.
    - **Quick Alert Dispatch**: 1-click buttons to "Send SMS Reminder" and "Send Email Reminder" manually or for testing via `sendLoanBorrowerReminderAction`.
- **Automated Cron Scheduling & "Once a Day" Rule**:
  - Updated `/api/cron/notifications` in [route.ts](file:///Users/jeunciano/Workstation/Bili/src/app/api/cron/notifications/route.ts) with `createAdminClient()`:
    - Scans active unpaid loans with `notify_borrower = true`.
    - Finds the earliest unpaid installment (or parent loan due date).
    - Checks if `daysDiff >= 0 && daysDiff <= 3` (3 days until due date).
    - Checks `bili_notification_logs` for `loan_id` on `todayStr` to strictly enforce the **once-a-day dispatch rule**.
    - Dispatches tailored, friendly SMS and Email messages containing borrower name, loan reason, upcoming payment amount, month number, due date countdown, and remaining total balance.

---

### 8.11 Editable Email & SMS Notification Templates with Dynamic Variables
- **User Requirement**: Add editable Email and SMS notification templates that can use dynamic variables for values.
- **Database Architecture**:
  - Applied migration `20260927_notification_templates.sql`:
    ```sql
    ALTER TABLE public.bili_notification_settings
    ADD COLUMN IF NOT EXISTS loan_sms_template text,
    ADD COLUMN IF NOT EXISTS loan_email_subject text,
    ADD COLUMN IF NOT EXISTS loan_email_body text,
    ADD COLUMN IF NOT EXISTS card_sms_template text,
    ADD COLUMN IF NOT EXISTS card_email_subject text,
    ADD COLUMN IF NOT EXISTS card_email_body text;
    ```
- **Dynamic Variable System (`src/lib/notifications/templates.ts`)**:
  - **Loan Notification Variables**:
    - `{{borrower_name}}`: Name of borrower (e.g. Vevien Unciano)
    - `{{amount_due}}`: Formatted upcoming payment due (e.g. ₱1,418.92)
    - `{{due_date}}`: Formatted due date (e.g. Oct 20, 2026)
    - `{{days_remaining}}`: Human-friendly countdown (e.g. Due in 3 days, Due tomorrow, Due today)
    - `{{loan_title}}`: Loan reason or item description (e.g. Apple iPad 11th Gen)
    - `{{installment_info}}`: Term progression (e.g. Month #1 of 24)
    - `{{balance_remaining}}`: Total outstanding balance (e.g. ₱34,054.00)
    - `{{lender_name}}`: App/lender signature (e.g. Bili)
  - **Credit Card Due Variables**:
    - `{{card_count}}`: Number of upcoming cards due in window (e.g. 2)
    - `{{card_list}}`: Itemized breakdown of upcoming cards with last 4 and due dates
    - `{{days_before}}`: Window in days (e.g. 3)
    - `{{app_url}}`: Direct dashboard link (`https://bili.app/dashboard/cards`)
  - **Interpolation Engine**:
    - `interpolateTemplate(template, variables)` safely matches and replaces tokens `{{key}}` while gracefully tolerating whitespace (e.g. `{{ borrower_name }}`).
- **Settings UI (`NotificationTemplatesEditor.tsx`)**:
  - Integrated into `/dashboard/settings` with a borderless, gradient-free layout.
  - Tabbed interface switching between **"Borrower Loan Reminders"** and **"Credit Card Bill Reminders"**.
  - Sub-tabs for **SMS Text Template** (with live character counter) and **Email Template** (Subject input and Body textarea).
  - **Interactive Variable Chips**: 1-click chip buttons automatically insert dynamic tokens into the template at the cursor position.
  - **Real-Time Live Previews**: Renders a simulated phone bubble (for SMS) and email card (for Email) with live test data so users see exactly what recipients receive.
  - Controls: "Save Templates" and "Reset Defaults" buttons.
- **Loan Details Page Customization (`LoanDetailsClient.tsx`)**:
  - Provides an expandable **"Customize & Preview Message"** drawer on individual loans.
  - Pre-populates with the borrower's actual loan data (name, next installment, amount, due date).
  - Allows lenders to review, add personal notes, insert variables, and dispatch custom SMS/Email reminders on demand.
- **Automated Cron Integration (`/api/cron/notifications/route.ts`)**:
  - Automatically loads each user's custom templates (falling back to standard defaults if unset) and interpolates live variables during the daily background cron run.

---

### 8.12 Gmail SMTP Integration & Real-Time Email Delivery Logs
- **User Requirement**: For email notifications, use Gmail SMTP, and display logs of emails sent with status.
- **SMTP Architecture & Engine (`src/lib/notifications/email.ts`)**:
  - **Relay Configuration**: Configured with `nodemailer` targeting Google's secure mail server:
    - Host: `smtp.gmail.com`
    - Port: `465` (SSL / TLS)
    - Authentication: Google Account email and 16-character Google App Password. Automatically sanitizes and removes spaces from tokens copied by users.
  - **Credential Resolution Priority**:
    1. Custom user credentials stored in `bili_notification_settings` (`smtp_email`, `smtp_app_password`).
    2. Server environment variables (`GMAIL_USER`, `GMAIL_APP_PASSWORD`).
    3. Graceful Simulation Fallback: If neither is set, emails are safely logged with status `'simulated'` and a diagnostic explanation, ensuring zero crashes or broken background processes.
  - **Email Template & HTML Styling**:
    - Dispatches with responsive HTML formatting (`generateNotificationHtml`) featuring brand styling, typography, and clear itemization.
  - **Connection Verifier**:
    - `verifyGmailConnection(user, pass)` tests the Google SMTP handshake on demand, reporting exact Google error messages (e.g. invalid credentials, 2FA required).
- **Database Schema Enhancements**:
  - Saved in migration `supabase/migrations/20260928_email_logs_enhancement.sql` and applied to cloud Supabase:
    ```sql
    ALTER TABLE public.bili_notification_logs
    ADD COLUMN IF NOT EXISTS email_subject text,
    ADD COLUMN IF NOT EXISTS error_message text;

    ALTER TABLE public.bili_notification_settings
    ADD COLUMN IF NOT EXISTS smtp_email text,
    ADD COLUMN IF NOT EXISTS smtp_app_password text;
    ```
- **Unified Email Pathways**:
  1. **Credit Card Bill Digest Alerts**:
     - `checkAndSendCardDueAlertsAction` in `notifications.ts`: Evaluates upcoming cards, renders custom or default templates, dispatches via `sendGmailEmail`, and records status (`sent`, `simulated`, `failed`), `email_subject`, and `error_message`.
     - Daily cron endpoint `/api/cron/notifications/route.ts`: Dispatches consolidated digests via Gmail SMTP with full status logging.
  2. **Borrower Loan Reminders**:
     - `sendLoanBorrowerReminderAction` in `loans.ts`: Sends upcoming payment reminders to borrowers via Gmail SMTP, capturing delivery status and recording the subject and error details in `bili_notification_logs`.
     - Daily cron endpoint `/api/cron/notifications/route.ts`: Automatically triggers scheduled borrower loan reminder emails through Gmail SMTP.
  3. **Test Notification**:
     - `sendTestNotificationAction` in `notifications.ts`: Verifies real outbound delivery to the nominated email address.
- **Settings UI & Email Delivery Logs Viewer (`SettingsClient.tsx`)**:
  - **Gmail SMTP Configuration Card**:
    - Inputs for Gmail Account address and 16-character Google App Password (with password mask/unmask toggle).
    - Expandable step-by-step setup guide (2-Step Verification, App Passwords, generating a "Bili" password).
    - "Verify Gmail Connection" button with real-time test badge (Handshake Successful vs SMTP Handshake Error).
    - Save action preserving custom SMTP credentials per user in `bili_notification_settings`.
  - **Dedicated Delivery Logs Viewer**:
    - **Status Badges**: Delivered (`bg-emerald-50 text-emerald-700` ✅), Simulated / Fallback (`bg-amber-50 text-amber-800` 🧪), Failed Delivery (`bg-rose-50 text-rose-700` ❌).
    - **Display Fields**: Prominent Email Subject line, Recipient email address, Timestamp, Associated Context (Credit Cards vs Borrower Loan Reminder).
    - **Delivery Diagnostics**: In-line diagnostic callout displaying the exact SMTP error reason if a dispatch fails or simulates.
    - **Expandable Message Body**: 1-click toggle to inspect the full body/content of the dispatched email.
    - **Filtering**: Channel filter tabs (`All Channels`, `Email Logs (Gmail SMTP)`, `SMS Logs`) and status pills (`All`, `Sent`, `Simulated`, `Failed`).
    - **Metric Counters**: Real-time summary tiles counting Total Events, Delivered, Simulated, and Failed.
    - **Dynamic Refresh**: "Refresh Logs" button to reload the newest log records without reloading the page.
  - **Tabbed Layout (Settings default, Templates, Logs)**:
    - Reorganized the notification center into 3 clear, focused tabs:
      1. **Settings (default)**: Notification preferences, destination email/phone, Gmail SMTP relay setup with Google App Password guide, alert frequency, and due window card diagnostics.
      2. **Templates**: Interactive editor for Borrower Reminders and Credit Card Digests with 1-click dynamic variable insertion chips, character counters, and live email/SMS phone previews.
      3. **Logs**: Full-width Email & Notification Delivery History with status badges (`Sent`, `Simulated`, `Failed`), subject lines, recipients, diagnostic notes, filter tabs, and expandable message content inspection.

---

### 8.13 Optimized Logs Search Engine & Lazy Loading Architecture
- **User Requirement**: Add search functionality to logs, lazy load data, should be optimized.
- **Database Index Optimization**:
  - Created a composite B-tree index in `supabase/migrations/20260928_notification_logs_index.sql`:
    ```sql
    CREATE INDEX IF NOT EXISTS idx_bili_notification_logs_user_created
    ON public.bili_notification_logs (website_id, user_id, created_at DESC);
    ```
  - Enables sub-millisecond paginated queries and sorting on high-volume notification tables.
- **Server Action Engine (`src/app/actions/notifications.ts`)**:
  - Refactored `getNotificationLogsAction(options: GetNotificationLogsOptions)`:
    - **Filter Pushdown**: Dispatches PostgreSQL `.range(from, to)` in optimized 15-record chunks instead of loading arbitrary large payloads.
    - **Multi-Field Search**: Sanitizes search input and searches across 5 columns simultaneously using PostgREST `ilike`:
      - `email_subject`
      - `recipient`
      - `message_body`
      - `card_names`
      - `error_message`
    - **Separate Fast Metrics Projection**: Gathers account-wide aggregate statistics (`total`, `sent`, `simulated`, `failed`, `email`, `sms`) by querying only enum identifiers without pulling heavy text bodies, keeping stats cards accurate regardless of pagination depth.
- **Client-Side Lazy Loading & Search Experience (`SettingsClient.tsx`)**:
  - **Debounced Search Input**: 280ms debounced keystroke handling with visual loader spinner (`Loader2`) and quick-clear `X` button.
  - **Dynamic Pagination**:
    - Initial page loads 15 items.
    - "Load More Logs ({remaining} remaining)" button fetches subsequent pages and appends without re-rendering existing items.
    - "All {totalCount} logs loaded" end-of-list indicator.
    - Filter changes (`channelFilter`, `statusFilter`) and search queries reset to Page 1 with instant feedback.
  - **Tonal Contrast & Zero-Border Compliance**: Adheres to soft background canvas shifts (`bg-[#F6F7F9]`, `bg-white`) and soft elevation.

---

### 8.14 Strategic Rebranding into Tenvi — Personal Wealth Infrastructure Platform
- **User Requirement**: Rebrand the project into **"Tenvi"** with the official business description:
  > *"Tenvi is a next-generation, all-in-one personal wealth infrastructure platform designed to bridge the gap between liquid cash and illiquid assets. Unlike traditional budgeting apps that only sync with credit cards or bank accounts, our platform provides a unified digital ledger that simultaneously tracks daily cash flow, automated savings targets, loan/debt amortization, and real-time property valuations. By bringing a user's entire net worth under a single dashboard, we eliminate financial fragmentation and empower modern asset-builders to optimize their equity, accelerate debt payoff, and grow long-term wealth."*
- **Scope & Implementation Details**:
  1. **Global App Metadata (`src/app/layout.tsx`)**:
     - Updated document `<title>` to `'Tenvi — Personal Wealth Infrastructure Platform'`.
     - Embedded the complete business description verbatim into the HTML meta description tag for search indexing and social cards.
  2. **Navigation Sidebar & Brand Identity (`src/components/Navigation/Sidebar.tsx`)**:
     - Replaced brand mark icon with **T**.
     - Updated product label to **Tenvi** and sub-brand descriptor to **Wealth OS**.
  3. **High-Impact Landing Page Experience (`src/app/page.tsx`)**:
     - Modernized the public landing page with an enterprise-grade wealth infrastructure hero section.
     - Highlighted the core positioning: *Bridging the gap between liquid cash and illiquid assets*.
     - Detailed the 4 core pillars of the unified digital ledger:
       - **Unified Cash Flow & Liquidity**: Real-time inflow and outflow tracking across liquid accounts.
       - **Credit & Debt Amortization**: Credit limits, spending power analytics, and payment countdowns.
       - **Friendly Loans & Receivables**: Multi-year amortization tables, borrowers ledger, and payment tracking.
       - **Automated Savings & Asset Equity**: Vault goals, interest yield targets, and wealth acceleration.
     - Updated copyright and footer badges to *© 2026 Tenvi. All-in-One Personal Wealth Infrastructure Platform*.
  4. **Authentication Surfaces (`src/app/(auth)/login/page.tsx` & `register/page.tsx`)**:
     - Login: Brand mark `T`, `"Welcome back to Tenvi"`, subtitle `"Sign in to manage your unified wealth ledger."`
     - Registration: Brand mark `T`, `"Create your Tenvi account"`, subtitle `"Your all-in-one personal wealth infrastructure ledger."`
  5. **Email & Alert Infrastructure (`src/lib/notifications/email.ts` & `templates.ts`)**:
     - Updated default email sender name to `Tenvi Wealth Infrastructure`.
     - Brand mark and header logo in transactional email templates updated to **Tenvi**.
     - Default alert templates updated: `[Tenvi Reminder]`, `[Tenvi Alert]`, signed by *- The Tenvi Wealth Team*.
     - Email template footer updated to *Tenvi — Personal Wealth Infrastructure Platform*.
  6. **Settings & Instructional Guides (`src/app/dashboard/settings/SettingsClient.tsx`)**:
     - App Password setup instructions updated to suggest app name **Tenvi**.
     - Digest aggregation explanation updated to reference **Tenvi**.
  7. **Backward-Compatible Styling & Token Layer (`src/app/globals.css`)**:
     - Added `.tenvi-card`, `.tenvi-well`, `.tenvi-input`, `.tenvi-btn-primary`, and `.tenvi-btn-secondary` CSS classes mapped alongside legacy `.bili-*` utilities to prevent any visual breakage.
     - Added `--shadow-tenvi-*` theme tokens.
  8. **Infrastructure & Multi-Tenancy Preservation**:
     - Multi-tenant identifiers (`website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953'`) and database table prefixes (`bili_*`) were intentionally maintained to avoid high-risk cloud PostgreSQL migrations or breaking existing live customer data.

---

### 8.15 Conversational Floating AI Assistant & Natural Language Ledger
- **User Requirement**: Add an AI feature, a floating chat where user can simply enter e.g. *"bought food worth 1120, yesterday using cash"* — the AI parses and automatically inputs as money out or expense (and if missing details are needed, the AI should ask).
- **Architecture & Component Overview**:
  1. **Financial NLP Parser (`src/lib/ai/financialParser.ts`)**:
     - **Deterministic Entity & Slot Extraction**:
       - **Intent/Kind**: Differentiates between Money Out (Expense: *bought, spent, paid, food, groceries, bills, coffee*) and Money In (Income: *received, salary, sweldo, earned, allowance*).
       - **Amount**: Extracts numbers, shorthand notation (e.g. *1.5k* -> *1500*), currency symbols (*₱, PHP, Pesos*), and keywords (*worth, cost, amounting to*).
       - **Date Parsing**: Understands relative dates (*today, yesterday, kahapon, the day before yesterday, last Friday/Monday*) and explicit calendar dates (*Sep 27, September 27*).
       - **Payment Method & Card Matching**: Automatically classifies *cash, gcash, maya, bank transfer, debit card*, and *credit card*. If the user specifies credit card or mentions bank names (*BPI, BDO, Metrobank, UnionBank, Chinabank, RCBC, EastWest*), the parser cross-references and matches against the user's active registered cards.
       - **Category Inference**: Intelligently classifies items into user-seeded categories (*Food & Groceries, Dining Out, Commute & Gas, Electric & Water Bills, Internet & Phone, Salary & Wages, etc.*).
     - **Conversational Slot-Filling State Machine**:
       - Tracks missing mandatory fields (`kind`, `amount`, `paymentMethod`, `creditCardId`).
       - If any required field is missing, the AI keeps conversational state and asks the user with contextual interactive quick-reply chips.
       - Upon receiving the missing detail, merges into the pending state while preserving previously parsed dates and notes.
  2. **AI Server Action Engine (`src/app/actions/ai.ts`)**:
     - `processAIChatMessageAction`:
       - Authenticates the current user session.
       - Queries active categories and registered credit cards from Supabase.
       - Runs parser or multi-turn state merge.
       - When all required fields are resolved, automatically executes write to `bili_transactions`.
       - Invalidates server component paths (`/dashboard`, `/dashboard/transactions`, `/dashboard/cards`) so all dashboard views immediately refresh.
       - Returns structured response with transaction ID, formatted amounts, and friendly message.
     - `undoAITransactionAction`:
       - Provides 1-click transactional rollback directly inside the chat if a user makes an accidental entry.
  3. **Interactive Floating UI (`src/components/AI/TenviAIChat.tsx`)**:
     - **Floating Trigger Button**: Anchored bottom-right (`fixed bottom-6 right-6 z-40`) with emerald pulse indicator, glowing badge, and smooth scale transitions.
     - **Zero-Border & Tonal Contrast Compliance**: Strict adherence to borderless philosophy with soft elevation shadows (`shadow-2xl`), crisp background shifts (`bg-slate-900`, `bg-[#F6F7F9]`, `bg-white`), and rounded pill styling.
     - **Starter Prompt Chips**: Quick 1-click prompt cards on initial load for instant demonstration.
     - **Interactive Quick-Reply Chips**: When the AI asks follow-up questions (e.g. *"How did you pay for this?"*), displays clickable chips (*Cash, GCash, Maya, Credit Card, Bank Transfer*) for frictionless 1-tap responses.
     - **Rich In-Stream Transaction Cards**: Renders full transaction badges (amount, category, payment method, date) with in-line **Undo** button.
     - **Auto-Scroll & Responsive Layout**: Smooth scrolling, auto-focus, keyboard shortcuts (Enter to send), and mobile-responsive viewport containment.
  4. **Global Layout Integration (`src/app/dashboard/layout.tsx`)**:
     - Mounted at the root of the authenticated dashboard layout, ensuring instant access across every page of Tenvi.

---

### 8.16 Two-Way Traceability Architecture for Credit Cards and Savings Accounts
- **User Requirement**: *"If transaction is added and connected to a certain CC or savings - it should also appear (connect) into that cards transaction, so it is traceable"*
- **Architecture & Implementation Details**:
  1. **Database Schema & Relational Integrity**:
     - Applied cloud migration on Supabase PostgreSQL:
       ```sql
       ALTER TABLE public.bili_transactions
         ADD COLUMN IF NOT EXISTS savings_id uuid REFERENCES public.bili_savings(id) ON DELETE SET NULL;

       CREATE INDEX IF NOT EXISTS idx_bili_transactions_credit_card_id ON public.bili_transactions(credit_card_id);
       CREATE INDEX IF NOT EXISTS idx_bili_transactions_savings_id ON public.bili_transactions(savings_id);
       ```
     - Persisted local migration file at `supabase/migrations/20260928_add_savings_to_transactions.sql`.
  2. **Type Contracts & Zod Validation**:
     - `src/types/index.ts`: Extended `Transaction` interface with `savings_id?: string | null` and `savings?: SavingsAccount | null`.
     - `src/lib/validations/schemas.ts`: Updated `transactionSchema` with `savingsId: z.string().uuid().optional().nullable()`.
  3. **Automated Balance Synchronization & Server Actions**:
     - `createTransactionAction` (`src/app/actions/transactions.ts`):
       - Inserts transaction with both `credit_card_id` and `savings_id`.
       - When connected to a savings account: automatically increments `bili_savings.current_balance` for `income` deposits, and decrements for `expense` withdrawals.
       - Revalidates all relevant route caches (`/dashboard`, `/dashboard/transactions`, `/dashboard/cards`, `/dashboard/savings`).
     - `deleteTransactionAction`:
       - Automatically reverts balance adjustments on `bili_savings` when a connected transaction is deleted.
     - `processAIChatMessageAction` & `undoAITransactionAction` (`src/app/actions/ai.ts`):
       - Tenvi AI automatically detects, verifies, and links transactions to both Credit Cards and Savings Accounts.
       - Full rollback capability restores savings balances if user clicks "Undo" inside the floating AI assistant.
  4. **Natural Language Financial NLP Parser Expansion (`src/lib/ai/financialParser.ts`)**:
     - Implemented `parseSavingsAccount` to match savings vaults by custom nickname or institution name (e.g. *Maya Savings, CIMB, BDO Savings, Emergency Vault*).
     - State machine prompts for missing credit card or savings choices and exposes interactive quick-select chips.
  5. **Credit Card Traceability Activity Ledger (`/dashboard/cards`)**:
     - Queries `bili_transactions` filtered by `credit_card_id` joined with `bili_categories`.
     - Renders an interactive, expandable **"Connected Card Swipes ({count})"** ledger inside each credit card card.
     - Displays swipe date, category tag, description/note, and exact amount.
     - Card limit utilization seamlessly sums both direct credit card transaction swipes and installment loans.
  6. **Savings Vault Traceability Activity Ledger (`/dashboard/savings`)**:
     - Queries `bili_transactions` filtered by `savings_id` joined with `bili_categories`.
     - Renders an expandable **"Connected Transactions ({count})"** ledger directly inside each savings account card.
     - Distinguishes deposits (`+`) and withdrawals (`-`) with color-coded typography and timestamps.
  7. **Universal Two-Way Navigation & Interactive UI**:
     - `TransactionModal` (`src/components/Forms/TransactionModal.tsx`): Exposes an optional "Connect to Savings / Vault Account" selector for non-credit card payment methods.
     - `TransactionsClient` (`src/app/dashboard/transactions/TransactionsClient.tsx`): Connected credit cards and savings vaults render as clickable badge links navigating directly to `/dashboard/cards` or `/dashboard/savings`.
     - `DashboardOverviewClient` (`src/app/dashboard/DashboardOverviewClient.tsx`): Displays credit card and savings account badges in the Recent Activity table.

---

### 8.17 Credit Card Details Page & Statement Date Cycle Grouping Architecture
- **User Requirement**: *"When credit card's card section is clicked - redirect to details page, displaying card details and it's transactions group by statement date"*
- **Architecture & Implementation Details**:
  1. **Dynamic Details Route & Data Ingestion (`src/app/dashboard/cards/[id]/page.tsx`)**:
     - Authenticates user session and queries `bili_credit_cards` scoped by `website_id` and `user.id`.
     - Ingests all direct card transactions (`bili_transactions` where `credit_card_id = id`) with category metadata.
     - Ingests swiped installment loans (`bili_loans` where `credit_card_id = id`) with borrower contacts.
     - Provides graceful fallback UI if the card is not found or unauthorized.
  2. **Billing Statement Cycle Grouping Engine (`src/lib/finance/calculations.ts`)**:
     - `groupTransactionsByStatementDate(transactions, statementDay, dueDay, referenceDate)`:
       - Evaluates transaction dates (`occurred_on`) relative to the card's monthly `statement_day` (cutoff day).
       - Transactions after the cutoff roll over to the subsequent billing cycle; transactions on or before remain in the current cycle.
       - Computes accurate cycle boundary ranges (`cycleStartDate` – `cycleEndDate`).
       - Calculates statement payment due dates based on `due_day`, accounting for month lengths and countdowns.
       - Guarantees the **Current Unbilled Cycle** is always generated and anchored at the top with live unbilled spend.
       - Categorizes statement status into: `current_unbilled`, `billed_due_soon` (with countdown: e.g. *"Due in 7 days"*), and `closed`.
  3. **High-Impact Details Interface (`src/app/dashboard/cards/[id]/CardDetailsClient.tsx`)**:
     - **Physical Card Visualization**: Displays theme styling, masked number `•••• •••• •••• {last_4}`, bank name, card name, and spending power.
     - **Financial Metrics**: Stat cards for Available Spending Power, Total Utilized (direct swipes + swiped loans), Statement Cutoff day, and Payment Due countdown.
     - **Connected Loans Breakdown**: Displays any loans swiped for others with borrower details and balance remaining.
     - **Statement Breakdown Ledger**: Collapsible statement cycle cards featuring cutoff date, cycle date range, payment due date, total statement spend, search filter, and list of swipe records.
     - **In-Page Actions**: Quick "+ Log Card Swipe" pre-selecting this card, "Edit Card", and "Remove Card".
  4. **Clickable Card Redirection Across Surfaces**:
     - `CardsClient.tsx` (`src/app/dashboard/cards/CardsClient.tsx`): Physical card section is wrapped in an interactive `Link` with subtle scaling (`hover:scale-[1.015]`), an explicit *"Statements →"* pill, and a dedicated *"Statements"* action button.
     - `TransactionsClient.tsx` (`src/app/dashboard/transactions/TransactionsClient.tsx`): Card badges link directly to `/dashboard/cards/[id]`.
     - `DashboardOverviewClient.tsx` (`src/app/dashboard/DashboardOverviewClient.tsx`): Credit Card Watcher rows and Recent Activity card tags link directly to `/dashboard/cards/[id]`.

---

### 8.18 Dynamic Spend Float Optimization: 'Best Card to Swipe Today' Architecture
- **User Requirement**: *"In card and due dates page, display what card is best to use to spend on current date (like when statement date has past near)"*
- **Architecture & Implementation Details**:
  1. **Float & Grace Period Calculation Engine (`src/lib/finance/calculations.ts`)**:
     - `calculateOptimalCardToSwipe(cards, transactions, linkedLoans, referenceDate)`:
       - Evaluates the user's active credit cards on any given calendar date against each card's `statement_day` and `due_day`.
       - Calculates the interest-free grace period / cash float duration: days between today and the payment due date for the statement that will bill today's charge.
       - Identifies cards whose monthly statement cutoff just passed (e.g. 1-10 days ago), granting the maximum runway (40-55+ days of float).
       - Automatically detects cards approaching cutoff within 0-2 days and flags them as `caution` with strategic advice to hold spending so purchases roll into the next cycle.
       - Ranks cards primarily by float duration and available credit limit.
  2. **High-Impact Recommendation Spotlight Banner (`src/app/dashboard/cards/CardsClient.tsx`)**:
     - Displays a featured hero recommendation box showing:
       - Card name, bank, last 4 digits, and visual mini-card badge with the card's theme.
       - Exact days of interest-free float (e.g. *"45 Days Interest-Free"*).
       - Plain-language strategy note (e.g. *"Statement cutoff passed 8 days ago! Today's swipe won't be billed until Oct 20 and isn't due until Nov 12."*).
       - Upcoming statement cutoff date and exact payment due date.
       - Action buttons: "+ Log Swipe" with this card pre-selected in `TransactionModal`, and "Details →".
     - Caution alert banner for cards closing within 1-2 days to avoid premature billing.
     - Interactive *"Compare All Cards"* expandable table ranking every card by interest-free runway and available credit line.
  3. **Visual Cues on Individual Cards**:
     - The top recommendation card is badged with `⭐ Best to Swipe` and glowing green indicator.
     - Individual cards show their exact spending runway (e.g. `45d runway` or `Cutoff Near`).
  4. **Card Details Integration (`src/app/dashboard/cards/[id]/CardDetailsClient.tsx`)**:
     - Each card details view displays an interest-free runway banner calculating the exact grace period if swiped today.

---

### 8.19 Properties & Asset Fleet Management: Revenue, Boundary, Amortization & Annual Insurance
- **User Requirement**: *"add properties menu where user can add and input expense and income of each property, add overview. for example me, i have cars that i get daily income, expense like yearly insurance (renewed anually), monthly amort of the car"*
- **Architecture & Implementation Details**:
  1. **Database Schema & Multi-Tenant Ledger Extension (`supabase/migrations/20260928_create_bili_properties.sql`)**:
     - `public.bili_properties`:
       - Columns: `id`, `website_id`, `user_id`, `name`, `property_type` (`vehicle`, `real_estate`, `commercial`, `land`, `equipment`, `other`), `identifier` (e.g. license plate number / unit number), `estimated_value`, `purchase_price`, `purchase_date`, `monthly_amortization`, `amortization_due_day`, `annual_insurance_amount`, `insurance_renewal_date`, `expected_income_daily` (daily boundary), `expected_income_monthly` (monthly rent), `color_theme`, `status` (`active`, `maintenance`, `inactive`, `sold`), `notes`, `created_at`, `updated_at`.
       - RLS enabled with isolation on `user_id` and `website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953'`.
     - Altered `public.bili_transactions`:
       - Added `property_id uuid REFERENCES public.bili_properties(id) ON DELETE SET NULL` with index `idx_bili_transactions_property_id`.
       - Provides a unified financial ledger: property revenue flows into global income while property maintenance, amortizations, and insurance can be funded via cash, bank transfer, or credit cards.
     - Seeded specialized vehicle & property categories into `bili_categories` (Vehicle & Fleet Income, Rental & Lease Income, Vehicle Loan / Amortization, Auto Insurance & Registration, PMS / Repairs & Maintenance, Property Dues).
  2. **Pure Financial Calculations Engine (`src/lib/finance/calculations.ts`)**:
     - `calculateInsuranceRenewal(renewalDateStr, fromDate)`: Computes next renewal date, days remaining, friendly label (e.g. *"Renews in 12 days"*), and urgency state (`critical` if <= 7 days or overdue, `warning` if <= 30 days).
     - `calculatePropertyFinancials(property, transactions)`: Pure calculation facade computing total income, total operating expenses, net cash flow, income/expense transaction counts, monthly loan amortization, annualized insurance, and due dates.
  3. **Server Actions Engine (`src/app/actions/properties.ts` & `src/app/actions/transactions.ts`)**:
     - `createPropertyAction(data)`: Validates input with Zod `propertySchema` and inserts scoped property record.
     - `updatePropertyAction(id, data)`: Updates property attributes and revalidates `/dashboard/properties` layout.
     - `deletePropertyAction(id)`: Removes property and revalidates dashboard layouts.
     - Updated `createTransactionAction` and `deleteTransactionAction` to process `property_id` and revalidate property routes.
  4. **Modals & UI Components**:
     - `PropertyModal.tsx` (`src/components/Forms/PropertyModal.tsx`): Supports vehicles, real estate, land, and machinery with valuation, monthly loan amortization, due day of month, annual insurance amount, renewal date, and daily boundary/monthly rent run-rates.
     - `PropertyTransactionModal.tsx` (`src/components/Forms/PropertyTransactionModal.tsx`): 1-click logging for property revenue (daily boundary, monthly rent, trip fare) and expenses (monthly amortization, annual insurance renewal, oil change PMS, fuel).
     - `TransactionModal.tsx` (`src/components/Forms/TransactionModal.tsx`): Added optional target property assignment selector.
  5. **Navigation & Routes**:
     - `Sidebar.tsx` and `MobileNav.tsx`: Added "Properties & Assets" menu with `Building2` icon pointing to `/dashboard/properties`.
     - `/dashboard/properties` (`src/app/dashboard/properties/page.tsx` & `PropertiesClient.tsx`):
       - **Portfolio Overview Cards**: Total Portfolio Value, Total Property Income, Operating Expenses, and Net Operating Return.
       - **Monthly Run-Rate Commitments**: Monthly loan amortizations + annualized insurance reserve allocation.
       - **Upcoming Fixed Obligations Alert**: Dynamic alert banner highlighting loans due within 7 days and insurance renewals within 30 days.
       - **Asset Cards Grid**: Responsive grid displaying each asset's type icon, plate/unit number, valuation, income/expense/net pill, monthly loan amortization with due day countdown, annual insurance with renewal countdown, and quick "+ Log Income" / "+ Log Expense" buttons.
     - `/dashboard/properties/[id]` (`src/app/dashboard/properties/[id]/page.tsx` & `PropertyDetailsClient.tsx`):
       - Dedicated asset page with financial KPIs, fixed obligation countdowns, daily boundary/monthly rental targets, and complete searchable transaction ledger.

---

### 8.20 Card Statement Upload & Auto-Logging Engine (PDF/Image OCR & AI Vision)
- **User Requirement**: *"add feature in card details, where user can upload a card statement (pdf/image) the app will parse and log the details as swipe transaction of the current card"*
- **Architecture & Implementation Details**:
  1. **Statement Parsing Engine (`src/lib/ai/statementParser.ts`)**:
     - **Multi-Format Date Normalizer with Current Year Default**: Parses ISO, numeric (`MM/DD/YYYY`, `DD/MM/YYYY`, `MM/DD/YY`, `MM/DD`), and alpha dates (`AUG 25`, `25-SEP`, `Aug. 15`). If the year is not explicitly included in the document or on transaction rows, automatically defaults the year to the current calendar year (`new Date().getFullYear()`) across Gemini Vision AI, PDF parsing, OCR, and pasted text.
     - **Merchant & Amount Extractor**: Extracts clean merchant names while stripping terminal prefixes and reference numbers. Accurately extracts numerical amounts with currency indicators.
     - **Payment vs. Purchase Segregation**: Identifies payment lines (`PAYMENT - THANK YOU`, `AUTO-DEBIT`, `PYMT RCVD`, `CR` credit markers) to prevent double-counting bill settlements as card swipes.
     - **Smart Auto-Categorization**: Intelligent rule-based keyword matcher classifying merchants into standard user categories (`Food & Groceries`, `Commute & Gas`, `Dining Out`, `Shopping & Clothes`, `Electric & Water Bills`, `Entertainment & Subs`, `Health & Medical`).
  2. **Multi-Engine Document Processing (`src/app/actions/statements.ts`)**:
     - **PDF Statements**: In-memory text extraction using `pdf-parse` for electronic bank statements (BDO, BPI, UnionBank, RCBC, Metrobank, HSBC, etc.).
     - **Scanned Bills & Photos**: In-memory OCR using `tesseract.js` for mobile photos and scanned paper bills with 100% privacy and zero external API dependencies.
     - **Optional Gemini Vision AI**: Seamless support for Google Gen AI (`@google/genai` via Gemini 2.5 Flash / 1.5 Flash) if an API key is provided, generating structured JSON with multimodal accuracy.
     - **Paste Statement Text Option**: Direct raw text ingestion for users copying transactions from web banking portals.
  3. **Interactive Review & Verification Staging Modal (`src/components/Forms/StatementUploadModal.tsx`)**:
     - **Step 1 (Upload)**: Drag-and-drop zone for PDF, PNG, JPG, WEBP, or raw text paste tab with real-time status steps.
     - **Step 2 (Staged Review)**:
       - Summary metrics: total transactions detected, total purchases, total payments/credits, and data source indicator.
       - Filter tabs: Purchases Only (selected by default), Payments/Credits (deselected by default), and All.
       - Interactive staging table: individual checkboxes, editable dates, editable merchant names, category dropdowns, editable amounts, and delete/add row buttons.
       - "Select All" / "Deselect All" bulk operations.
       - Primary CTA: *"Import X Transactions (₱Total)"*.
  4. **Batch Import Server Action (`importStatementTransactionsAction`)**:
     - Validates credit card ownership and user session.
     - Performs atomic batch insert into `bili_transactions` with `credit_card_id = currentCard.id`, `payment_method = 'credit_card'`, and category associations.
     - Revalidates cache paths: `/dashboard`, `/dashboard/cards`, `/dashboard/cards/[id]`, and `/dashboard/transactions`.
  5. **Card Details Integration (`src/app/dashboard/cards/[id]/CardDetailsClient.tsx`)**:
     - Added prominent *"Upload Statement (PDF / Image)"* action button in top header actions.
     - Added companion *"Upload Statement"* button inside the statement billing cycle breakdown bar.
     - Automatically updates statement cycle groups and current unbilled spend upon import completion.

---

### 8.21 Gemini AI Vision Integration & Free-Tier Quota Consumption Monitor
- **User Requirement**: *"got Gemini API in .env now implement it - its better to display the limit or consumption of the API key"*
- **Architecture & Implementation Details**:
  1. **Google GenAI Client & Verified Model Architecture (`src/lib/ai/gemini.ts`)**:
     - Verified model connectivity against Google AI Studio using active key in `.env.local`.
     - Primary Model: `gemini-flash-latest` (optimal speed, high accuracy multimodal PDF & image understanding).
     - Secondary Fallback: `gemini-2.5-flash-lite`.
     - Zero-downtime offline fallback: Built-in `pdf-parse` & `tesseract.js` OCR.
  2. **Database Logging & Quota Tracking (`supabase/migrations/20260928_create_bili_ai_usage.sql`)**:
     - Table: `public.bili_ai_usage` with RLS isolation.
     - Logs: user ID, feature name, model used, token counts (input, output, total), round-trip latency (ms), status, and error messages.
     - Tracks daily usage against Google AI Studio free tier limits:
       - 1,500 Requests Per Day (RPD)
       - 15 Requests Per Minute (RPM)
       - 1,000,000 Tokens Per Minute (TPM)
  3. **Live Status & Quota Meter in Statement Upload Modal (`src/components/Forms/StatementUploadModal.tsx`)**:
     - Live indicator banner showing `Gemini AI Vision Active` with masked key.
     - Progress bar reflecting `{requestsUsed} / 1,500 daily requests used today` and remaining request capacity.
     - Automatically logs each statement processed through Gemini Vision into the database.
  4. **Dedicated AI & Gemini Vision Dashboard in Settings (`src/app/dashboard/settings/SettingsClient.tsx`)**:
     - Added 4th navigation tab: **"AI & Gemini Vision"** with real-time green connection pulse.
     - **Four High-Level Stat Cards**: Daily Requests Used (vs 1,500 cap), Burst Rate Limit (15 RPM), Tokens Processed Today, and Daily Reset Countdown.
     - **Daily Quota Consumption Progress Bar**: Visual percentage meter of daily free tier allocation.
     - **Live API Connection Test**: In-page ping button that tests key latency against Google GenAI API and reports millisecond response times.
     - **Feature Usage Breakdown**: Itemized count of Statement Vision Scans, AI Chat queries, and Diagnostics.

---

### 8.22 Financial Overview Upgrade: Advanced Matrix, Interactive Visual Charts & Runway Command Center
- **User Requirement**: *"update the Overview add some matrix,charts and any useful details"*
- **Architecture & Implementation Details**:
  1. **Dynamic Timeframe Selector**:
     - Added reactive timeframe filters: **This Month**, **Last 30 Days**, and **6 Months** with instant, zero-reload recalculation across all matrices and charts.
  2. **Wealth & Cashflow Matrix (4 Primary Metric Cards)**:
     - **Total Liquid Savings**: Live aggregate across all cash vaults.
     - **Money In**: Total inflows with count of income sources.
     - **Money Out**: Total outflows with daily burn run-rate.
     - **Net Savings & Health**: Net cash retained with percentage savings rate badge.
  3. **Financial Health & Runway Metric Strip (3 Tonal Sub-Cards)**:
     - **Emergency Living Runway**: Months of living expenses covered by total liquid reserves with buffer badge.
     - **Credit Utilization Meter**: Overall portfolio credit utilization across all active cards with dynamic color progress bar (Healthy vs High).
     - **Outstanding Receivables**: Combined total of people who owe you from active loans and unpaid bill splits with quick link to `/dashboard/loans`.
  4. **Interactive 6-Month Cash Flow Trend Chart**:
     - Bespoke, responsive SVG visualization displaying dual vertical rounded pill bars (Emerald for Inflow, Rose for Outflow).
     - Interactive hover tooltips displaying month-by-month net cash flow, income, and expense.
     - Summary KPI bar: Average Inflow, Average Outflow, and 6-Month Net Gain.
  5. **Expense Distribution Matrix & Multi-Segment Progress Bar**:
     - Category breakdown grouped by highest spend with percentage share and transaction counts.
     - Multi-colored proportional segmented progress bar representing the entire expense portfolio.
  6. **"Best Card to Swipe Today" Spotlight**:
     - Integrated `calculateOptimalCardToSwipe` directly on the main dashboard overview, surfacing the optimal card, days of interest-free float, and cutoff advice with a 1-click "+ Swipe With This Card" action.
  7. **Properties & Fleet Management Snapshot**:
     - Integrated `bili_properties` to display total fleet valuation, monthly run-rate commitments (amortizations + annual insurance reserve), and upcoming obligation alerts directly on the Overview.

---

### 8.23 Tenvi AI Assistant: Google Gemini GenAI Integration & Interactive Sample Prompts Suite
- **User Requirement**: *"integrate ai feature to the TENVI AI Assistant add some sample prompt user can use"*
- **Architecture & Implementation Details**:
  1. **Google Gemini GenAI Engine Integration (`src/app/actions/ai.ts`)**:
     - Connected the Tenvi AI Assistant directly to Google GenAI with multi-model failover (`gemini-3.5-flash-lite`, `gemini-3.8-flash`, `gemini-flash-latest`, `gemini-flash-lite-latest`, `gemini-3.5-flash`).
     - Injects real-time user financial context into the prompt:
       - Active credit cards with interest-free float days, statement cutoffs, and payment due dates.
       - Best card to swipe recommendation calculated by `calculateOptimalCardToSwipe`.
       - Active savings stashes and bank vaults with live balances.
       - Current month financial snapshot (total spent, total income, net savings, emergency living runway in months).
       - User categories (expense & income).
       - Outstanding receivables (money owed to user) and payables.
     - Automatically logs token consumption and latency to `public.bili_ai_usage` (`feature: 'ai_chat'`).
     - Multi-turn conversation handling: effortlessly resolves missing fields (e.g. asking for payment method, offering user's specific cards as quick replies, and updating pending state).
     - Seamless offline/no-key fallback: defaults to local regex parser `parseFinancialInput` and instant answers for core wealth queries.
  2. **Interactive Sample Prompt Library & UI (`src/components/AI/TenviAIChat.tsx`)**:
     - **20 Curated Sample Prompts across 5 Financial Categories**:
       - 💳 **Credit Cards & Float**: *"Which card is best to swipe today?"*, *"Bought dinner 1,850 using BDO card"*, *"Swiped 4,500 at Uniqlo with credit card"*, *"When is my next credit card due date?"*.
       - 📱 **E-Wallets (GCash & Maya)**: *"Paid 195 for coffee via GCash today"*, *"Paid 3,400 electric bill via GCash"*, *"Paid 4,200 Meralco bill using Maya"*, *"Paid 1,899 internet bill via GCash"*.
       - 💵 **Daily Cash & Commute**: *"Bought food worth 1120, yesterday using cash"*, *"Paid 340 for Grab car kanina in cash"*, *"Spent 850 at Mercury Drug using cash"*, *"Paid 150 parking fee cash"*.
       - 💰 **Income & Vaults**: *"Received 35,000 monthly salary to BPI"*, *"Received 8,500 freelance client payment via GCash"*, *"Deposited 10,000 to Emergency Fund vault"*, *"How much are my total savings across accounts?"*.
       - 📊 **Wealth Insights & Advice**: *"How much did I spend this month?"*, *"What is my emergency living runway in months?"*, *"Who owes me money right now?"*, *"Give me financial advice based on my spending and savings"*.
     - **Interactive Slide-In Prompt Library Drawer**:
       - Filterable by category pills (`All`, `Cards & Float`, `GCash & Maya`, `Daily Cash`, `Income & Vaults`, `Wealth & Advice`).
       - Each prompt features dual actions:
         - **Send Now ⚡**: Instantly transmits the prompt to Gemini for immediate response.
         - **Edit First ✏️**: Populates the chat textarea with the prompt so users can customize amounts, merchants, or dates before sending.
     - **Horizontal Quick-Prompt Chips Bar**:
       - Positioned immediately above the chat input box for frictionless 1-click access during conversations.
       - Includes direct link to open the full Prompt Ideas library.
     - **Starter Cards in Welcome Screen**:
       - Highlights top starter prompts right when the user opens the chat assistant.

---

### 8.24 Loan Management: Edit Loan Details, Monthly Interest Rate Engine & Credit Card Billing Cycle Synchronization
- **User Requirement**: *"In loan details, user should be able to edit Loan details, add interest rate monthly, if loan is swipe thru card it should follow the card's due date,statement date"*
- **Architecture & Implementation Details**:
  1. **Database Schema Enhancements (`supabase/migrations/20260928_loan_interest_and_card_sync.sql`)**:
     - Applied to Supabase PostgreSQL:
       - `ALTER TABLE public.bili_loans ADD COLUMN IF NOT EXISTS monthly_interest_rate numeric(5, 2) DEFAULT 0.00, ADD COLUMN IF NOT EXISTS total_interest numeric(12, 2) DEFAULT 0.00;`
       - `ALTER TABLE public.bili_loan_installments ADD COLUMN IF NOT EXISTS principal_amount numeric(12, 2), ADD COLUMN IF NOT EXISTS interest_amount numeric(12, 2), ADD COLUMN IF NOT EXISTS statement_date date;`
  2. **Credit Card Billing Cycle Math & Cent-Safe Schedule Generator (`src/lib/finance/calculations.ts`)**:
     - Enhanced `generateInstallmentSchedule` with `InstallmentScheduleOptions` (`monthlyInterestRate`, `cardStatementDay`, `cardDueDay`).
     - **Credit Card Billing Cycle Synchronization Logic**:
       - When swiped on or before the card's `statement_day`, installment #1 is billed on that month's statement cut-off, with payment due on the linked card's `due_day` of the following month.
       - When swiped after the card's `statement_day`, installment #1 is billed on the subsequent month's statement cut-off, providing maximum interest-free float and locking payment due dates to the card's `due_day`.
     - **Monthly Interest Math**:
       - `totalInterest = principalToFinance * (monthlyInterestRate / 100) * months`.
       - `totalRepayable = principalToFinance + totalInterest`.
       - Separately calculates cent-safe principal shares and interest shares to guarantee `principal_amount + interest_amount = amount` on every row without any 1-cent rounding discrepancies.
  3. **Full Server Actions Support (`src/app/actions/loans.ts`)**:
     - `updateLoanAction`: Complete loan editing action supporting contact change/creation, purchase amount adjustments, downpayment modification, monthly interest rate recalculation, credit card cycle re-sync, installment schedule regeneration (preserving already-paid count), and audit synchronization of linked `bili_transactions`.
     - `createLoanAction`: Added `monthlyInterestRate` support, card due date locking, and stored `statement_date`, `principal_amount`, and `interest_amount`.
     - `setupLoanInstallmentsAction`: Added `monthlyInterestRate` support and card statement/due date synchronization.
  4. **New Component: `EditLoanModal` (`src/components/Forms/EditLoanModal.tsx`)**:
     - Clean, zero-border tonal modal dialog allowing users to edit all parameters of an existing loan:
       - Borrower Contact picker or inline new person creation.
       - Total purchase amount and upfront downpayment with payment method selector.
       - Linked Credit Card selector with automatic cycle synchronization badge.
       - Monthly Interest Rate input with quick preset pills (0%, 1%, 1.5%, 2%, 3%).
       - Installment term duration selector (3 to 60 months).
       - Live financial preview card displaying principal financed, total interest, total repayable, and monthly due amount.
       - Borrower SMS / email reminder toggle.
  5. **Loan Details Client Enhancements (`src/app/dashboard/loans/[id]/LoanDetailsClient.tsx`)**:
     - Top navigation: Added `Edit Loan Details` button.
     - Overview Header: Added `Monthly Interest Rate` badge and `Card Cycle Synced` badge.
     - Balance Metrics Card: Added dedicated Interest Breakdown row showing Monthly Interest Rate, Total Interest Accrued, and Total Repayable.
     - Loan Meta Details Row: Added Interest Rate column (`X% / month` or `0%`).
     - Linked Credit Card Card: Displays card billing cycle sync banner with exact statement cutoff day and payment due day.
     - Installment Schedule Table: Due Date column now shows the Statement Cutoff Date; Amount Due column displays the Principal and Interest breakdown (`P: ₱... • I: ₱...`).
     - Schedule Reconfiguration Drawer & Generator: Added monthly interest rate input and quick preset pills.
     - Integrated `EditLoanModal`.
  6. **Loan Creation Modal (`src/components/Forms/LoanModal.tsx`)**:
     - Added Monthly Interest Rate input with quick preset pills (0%, 1%, 1.5%, 2%, 3%).
     - Automatically locks monthly due day to card's `due_day` when a credit card is selected.
     - Added card billing cycle sync banner and live calculation preview factoring in monthly interest.

---

### 8.25 Receivables Command Center & Debtor Directory (`/dashboard/receivables`)
- **User Requirement**: *"add feature receivables - you decide where to best put this feature"*
- **Design & Placement Decision**:
  - Rather than burying receivables within a sub-menu, we elevated it into a dedicated **Unified Receivables Hub** at `/dashboard/receivables`.
  - Seamlessly links to the existing specialized tools (`/dashboard/loans` and `/dashboard/splits`) while offering an executive, aggregated vantage point of all uncollected wealth.
  - Featured in the Desktop Sidebar (`Sidebar.tsx`) and Mobile Bottom Nav (`MobileNav.tsx`) under **Receivables Hub**, and connected directly to the **"Owed To You"** card on the Main Dashboard Overview.
- **Architecture & Implementation Details**:
  1. **Unified Portfolio Aggregation (`src/app/dashboard/receivables/page.tsx`)**:
     - Concurrently queries `bili_loans` (with installments, contacts, credit cards, payments) and `bili_bill_splits` (with participants and contacts).
     - Consolidates all uncollected consumer loans, multi-year installments, and shared group bill splits into one unified accounts receivable ledger.
  2. **Executive Financial Health Strip (`src/app/dashboard/receivables/ReceivablesClient.tsx`)**:
     - **Total Receivables**: Full aggregate balance owed across all loans and bill splits.
     - **Due This Month**: Installments and split shares scheduled for collection within the current calendar month.
     - **Overdue / At Risk**: Receivables past due with item counts and alert styling.
     - **Collected This Month**: Repayments received during the active calendar month.
     - **Interest Accrued**: Total yield earned from financing loans.
  3. **Aging & Cash Flow Inflow Runway**:
     - Proportional visual progress meter mapping receivables into:
       - 🔴 **Overdue** (> 0 days past due date).
       - 🟡 **Due This Month** (Scheduled within 30 days).
       - 🔵 **Future Amortizations** (> 30 days remaining).
       - 🟢 **Recovered Capital** (Collected this month).
  4. **Debtor Directory ("By Person" Tab)**:
     - Person-centric rollup consolidating all debts per contact (e.g. Maria Santos: ₱18,500 total across 1 Loan and 2 Bill Splits).
     - Displays borrower mobile phone, email, total amount originated, total repaid, and percentage progress bar.
     - Includes expandable breakdown items and 1-click **Send Reminder** action.
  5. **Unified Timeline Feed with 1-Click Settlement**:
     - Chronological list of loans and split participant items with visual badges (`LOAN` vs `BILL SPLIT`), swiped credit card tag, due dates, countdowns, and remaining balances.
     - Instant 1-click **Settle Share** action updating participant state with optimistic UI feedback.
  6. **Multi-Channel Reminder Engine**:
     - Modal dialog enabling users to dispatch customized SMS or Email payment reminders to borrowers or split participants using Tenvi's notification infrastructure.
     - Added `sendSplitParticipantReminderAction` in `src/app/actions/splits.ts`.
     - Configured cache revalidation across `/dashboard/receivables` for all loan and split mutations.

---

### 8.26 Credit Card Details: Hover-Triggered Transaction Deletion
- **User Requirement**: *"in creditcard details add option to delete transaction --button appears only when hover"*
- **Architecture & Implementation Details**:
  1. **Hover-Only Action UI Pattern (`src/app/dashboard/cards/[id]/CardDetailsClient.tsx`)**:
     - Applied Tailwind's `group` and `opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity` to transaction items within statement cycle groups.
     - Keeps the interface ultra-clean by hiding actionable delete icons until the user points or hovers over a specific transaction record.
     - Includes tactile feedback: red hover state (`hover:text-rose-600 hover:bg-rose-50`) and inline loading spinner (`Loader2`) while the deletion is processing.
  2. **Optimistic Local State & Financial Recalculation**:
     - Converted `transactions` to reactive local state (`currentTransactions`).
     - When deletion is confirmed, the transaction is immediately removed from the cycle group, instantly updating total direct spend, available credit limit power, and statement group summaries without waiting for network round-trips.
     - Safely rolls back to previous state if the server operation fails.
  3. **Server Action & Cache Invalidation (`src/app/actions/transactions.ts`)**:
     - Integrated with `deleteTransactionAction(id)`.
     - Automatically revalidates `/dashboard/cards`, `/dashboard/cards/[id]`, `/dashboard/transactions`, and `/dashboard/receivables`.

---

### 8.27 Statement Duplicate Detection & Monthly Installment Card Mapping
- **User Requirement**:
  1. *"when parsing an statement file - see if duplicate transaction, check if the monthly transaction is already in installment and for example Jessa Mae Loan of 65987 of iphone 17 pro (installment for 12 mos) mapped automatically to creditcard as monthly of 3415.59 if that appears again in transaction flag it as duplicate"*
  2. *"also the loan of Jess Mae should only appear monthly - currently it appears with the whole amount even if it is an installment"*
- **Architecture & Implementation Details**:
  1. **Credit Card Installment Mapping (Monthly vs Lump Sum)**:
     - **Previous Issue**: When an installment loan was swiped on a card (e.g. Jessa Mae iPhone 17 Pro ₱65,987 for 12 mos), `createLoanAction` / `updateLoanAction` recorded a single lump sum expense of ₱65,987.00 in `bili_transactions`. This caused credit card statement cycles to display the full ₱65,987 rather than the actual monthly installment amount (₱3,415.59/mo), and distorted credit limit utilization.
     - **Solution**: Refactored `createLoanAction` and `updateLoanAction` in `src/app/actions/loans.ts` so that installment loans swiped on cards automatically generate monthly expense transactions mapped to each installment's statement cutoff date (or due date) with the exact monthly amount (₱3,415.59) and notation (e.g. `Jessa Mae Unciano (Iphone 17 Pro 256) - (01/12)`). Non-installment loans continue to map as single purchases.
     - **Double-Counting Prevention**: In `src/lib/finance/calculations.ts` and `CardDetailsClient.tsx`, filtered `!t.loan_id` in direct spend calculations so that remaining loan balance (`l.balance_remaining`) and statement transactions are never double counted against card credit limits.
     - **Database Migration**: Synced existing records for Jessa Mae's loan (`b9b686de-510e-499f-b823-3ea269bd6a84`) and Freddie's loan (`1a8e40cc-ef77-47a7-acbc-c2e90bf3e9bf`), replacing previous lump-sum transactions with true monthly installment schedules.
  2. **Intelligent Duplicate Detection Algorithm (`src/lib/ai/statementParser.ts`)**:
     - Built `detectStatementDuplicates(transactions, existingTransactions, cardLoans)`:
       - **Loan Installment Matching**: Checks extracted transactions against active installment schedules on the card. Compares amounts within cent rounding tolerance (`<= ₱0.10`), statement cutoff date windows (`<= 14 days`), and borrower/reason textual patterns (e.g. "Jessa", "iPhone", `01/12`).
       - **Existing Transaction Matching**: Compares extracted transactions against transactions already stored for the card (exact date match or ±3 days with merchant note similarity).
       - **Result Flagging**: Sets `isDuplicate: true`, `duplicateType: 'loan_installment' | 'existing_transaction'`, and generates user-friendly explanations (e.g. *"Matches Loan Installment #1/12 for Jessa Mae Unciano (Iphone 17 Pro 256) (₱3,415.59)"*).
  3. **Statement Upload Modal Integration (`src/components/Forms/StatementUploadModal.tsx`)**:
     - **Safe Default Deselection**: Duplicate transactions are automatically deselected (`selected: false`) by default when parsed, protecting users from double-importing charges.
     - **Visual Badges & Reasoning Subtitles**: Displays purple `Installment Match` or amber `Duplicate` pill badges alongside explicit explanation subtitles explaining why the item was flagged.
     - **Dedicated Duplicates Tab**: Added a filter tab `"Duplicates (X)"` allowing users to quickly isolate and review all flagged duplicate items.
     - **Toast Notification**: Summarizes detected transactions and flags (e.g. *"Parsed 24 items (1 duplicate(s) flagged & unselected)"*).

---

### 8.28 Credit Card Details: Current Unbilled & Current Month Cut-Off Default View
- **User Requirement**:
  - *"display the current month cutoff only as default for example this month September 15 cutoff (due Oct 1)"*
  - *"aside from that hide it default but add feature to toggel display all cut offs that has transactions"*
  - *"on top of currenth month, display the Current Unbilled Cycle"*
- **Architecture & Implementation Details**:
  1. **Dual Cycle Architecture (`src/lib/finance/calculations.ts`)**:
     - Added `isCurrentMonth: boolean` and `isCurrentCycle: boolean` to `StatementGroup` interface.
     - In `groupTransactionsByStatementDate`, derived both:
       - `currentMonthKey`: the current calendar month's statement cut-off (e.g. `2026-09`, September 15 cutoff, due Oct 1).
       - `currentCycleKey`: the active unbilled cycle for charges incurred after the statement cut-off (e.g. `2026-10`, October 15 cutoff).
     - Both cycles are guaranteed to exist in `groupsMap` so users always have live visibility into their immediate billed statement and their unbilled live spend.
     - Statements are sorted newest statement cutoff date first, naturally placing the **Current Unbilled Cycle on top**, followed immediately by the **Current Month Statement Cut-Off**.
  2. **Default View Filtering (`src/app/dashboard/cards/[id]/CardDetailsClient.tsx`)**:
     - Configured `defaultCutoffKeys` to include `g.isCurrentCycle || g.isCurrentMonth`.
     - In the default tab:
       - **On Top**: Current Unbilled Cycle (`isCurrentCycle`, e.g. Oct 15 cutoff with live swipes logged after Sept 15).
       - **Below**: Current Month Statement Cut-Off (`isCurrentMonth`, e.g. Sep 15 cutoff, due Oct 1, with billed swipes).
     - Distant future installment cycles (e.g. 11 monthly installments from Nov 2026 to Aug 2027) and older closed statements are hidden by default.
  3. **Interactive Tab Controls & Visual Feedback**:
     - Added segmented filter tabs above the statement list:
       - **"Current & Unbilled"**: Focused view showing the Current Unbilled Cycle on top and Current Month Cut-Off below.
       - **"All Cut-Offs (Y)"**: One-click expansion showing all statement cut-offs with transactions or active billing cycles.
     - Displayed live indicator count of hidden cut-offs (e.g. *"11 other statement cut-offs hidden"*).
     - Added bottom helper card with action button (`Show All X Cut-Offs →`) and collapse button (`← Show Current & Unbilled Only`).
  4. **Universal Merchant Search Behavior**:
     - When users search using `"Search swipes by merchant..."`, the filter automatically queries across **all** cut-offs with transactions rather than restricting only to default cut-offs, preventing missed search matches.

---

### 8.29 Dashboard Shell: Pinned Persistent Sidebar Menu & Independent Main Content Scroll
- **User Requirement**: *"make the main page only scrollable so the menu stays visible always"*
- **Architecture & Implementation Details**:
  1. **Viewport Shell Constrain (`src/app/dashboard/layout.tsx`)**:
     - Updated dashboard root container to `h-screen w-full bg-[#F6F7F9] flex flex-col md:flex-row overflow-hidden`.
     - Locks the document viewport to 100vh, eliminating whole-window body scrolling and page jumping.
  2. **Pinned Persistent Desktop Navigation**:
     - Configured the sidebar wrapper to `hidden md:flex shrink-0 h-full`.
     - In [`Sidebar.tsx`](file:///Users/jeunciano/Workstation/Bili/src/components/Navigation/Sidebar.tsx), updated aside container to `w-64 bg-white flex flex-col justify-between p-6 shadow-sm h-full overflow-y-auto`.
     - The menu, brand header, navigation links (Overview, Spending, Receivables, Assets, Savings, Cards, Loans, Splits, Settings), user profile card, and Log Out button remain permanently locked and visible on screen at all times.
  3. **Dedicated Main Content Scroll Area**:
     - Converted `<main>` into the sole scrollable viewport: `<main className="flex-1 h-full overflow-y-auto">`.
     - All pages across the dashboard scroll smoothly inside this container without affecting the sidebar menu position.
  4. **Mobile & Floating Component Safety**:
     - Preserved mobile fixed bottom navigation (`MobileNav` with `fixed bottom-0 z-50`).
     - Preserved floating AI assistant (`TenviAIChat` pinned to `fixed bottom-6 right-6 z-40/z-50`).

---

### 8.30 White-Labeling & Branding: Tenvi AI Intelligence Engine
- **User Requirement**: *"make the TENVI AI tobe branded, remove the gemini label"*
- **Architecture & Implementation Details**:
  1. **Tenvi AI Conversational Assistant (`src/components/AI/TenviAIChat.tsx`)**:
     - **Welcome Message**: Removed "powered by Google Gemini" attribution; updated to: *"👋 Hi! I'm your **Tenvi AI Wealth Assistant**."*
     - **Trigger Button**: Replaced *"Gemini Wealth & Ledger"* subtitle with *"Wealth OS & Ledger"*.
     - **Modal Header Badge**: Replaced *"Gemini Live"* badge with *"Tenvi Live"*.
     - **Input Footer**: Replaced *"Google Gemini GenAI Powered"* text with *"Tenvi Intelligence Engine"*.
  2. **Statement Parser & Vision Uploads (`src/components/Forms/StatementUploadModal.tsx`)**:
     - Replaced *"Analyzing statement image with Gemini AI..."* with *"Analyzing statement image with Tenvi AI Vision..."*.
     - Replaced *"Gemini AI Vision Active"* with *"Tenvi AI Vision Active"* and pill badge with *"TENVI VISION"*.
     - Replaced accordion label and input heading to *"AI Vision API Key"*.
  3. **Settings & Intelligence Center (`src/app/dashboard/settings/SettingsClient.tsx`)**:
     - Replaced tab label *"AI & Gemini Vision"* with *"Tenvi AI & Vision"*.
     - Updated hero heading to *"Tenvi AI Vision & Intelligence Engine"*.
     - Updated service description and ping verification responses to reference *"Tenvi AI Connection Verified"* and *"Tenvi Intelligence Engine"*.
     - Renamed quota indicator to *"Tenvi AI High-Speed Allocation"*.






---

### 8.31 Tenvi AI Chat Markdown Rendering & Strict Domain Guardrails
- **User Requirement**: *"i chat display properly the markdown response, add strict guardrails to only respond queries about tenvi or any relation to it, prevent outside topic"*
- **Architecture & Implementation Details**:
  1. **Full-Fidelity Markdown Rendering (`src/components/AI/MarkdownMessage.tsx`)**:
     - Integrated `react-markdown` and `remark-gfm` configured with custom Tailwind typography matching Tenvi's anti-AI design system:
       - **Headings & Hierarchy**: `h1`–`h3` styled with dark slate weights and compact margins.
       - **Text Formats**: Bold text (`strong`), italics (`em`), blockquotes (`blockquote` with indigo border and subtle tint), and horizontal rules (`hr`).
       - **Lists**: Ordered (`ol`) and unordered (`ul`) bullet lists with custom slate markers and comfortable line-height.
       - **Code Presentation**: Inline code rendered with soft gray badge and indigo monospace font; block code enclosed in dark slate syntax panels with horizontal scrolling.
       - **Structured Tables**: GitHub Flavored Markdown tables rendered with rounded card containers, subtle borders, and shaded header rows.
       - **Safe Hyperlinks**: Links rendered in indigo underline with target `_blank` and `rel="noopener noreferrer"`.
     - Integrated into [`TenviAIChat.tsx`](file:///Users/jeunciano/Workstation/Bili/src/components/AI/TenviAIChat.tsx), cleanly rendering both assistant replies and user inputs without raw asterisks or unformatted tokens.
  2. **Strict Domain & Topic Guardrails in GenAI System Prompt (`src/app/actions/ai.ts`)**:
     - **Permissible Topics**:
       - All **Tenvi** features and navigation (Dashboard, Transactions ledger, Credit Cards, billing cut-offs, due dates, Current Unbilled Cycle, statement uploads, Receivables/Pautang loans, Bill Splits, Savings vaults, Emergency Living Runway, Categories).
       - Personal finance, budgeting, cashflow, Philippine banking & e-wallets (GCash, Maya, BDO, BPI, UnionBank, Metrobank, RCBC, etc.), credit card utilization, float days, repayment strategies.
       - Natural language logging of expenses, income, deposits, and bills.
     - **Strict Prohibition on Outside Topics**:
       - Strictly forbids answering general programming/coding, software engineering, writing code or scripts, academic essays, homework, creative writing, poetry, jokes, cooking recipes, science, physics, history, geography, celebrity gossip, sports, gaming, horoscope, medical advice, relationship advice, or politics.
     - **Intent Classification & Protocol**:
       - Added `"out_of_bounds"` intent to the Gemini structured JSON response schema: `"log_transaction" | "financial_query" | "greeting_or_help" | "out_of_bounds"`.
       - For any off-topic prompt, Tenvi AI classifies the intent as `"out_of_bounds"` and returns a polite, branded markdown deflection redirecting the user back to Tenvi and personal finances with tailored quick replies.
  3. **Deterministic Offline & Fallback Guardrails**:
     - Created `isClearlyOffTopic(message)` and `hasFinancialOrTenviRelevance(message)` validators in [`ai.ts`](file:///Users/jeunciano/Workstation/Bili/src/app/actions/ai.ts).
     - Prior to regex/local transaction parsing, checks whether an input is off-topic or lacks financial relevance; if so, immediately returns the polite Tenvi guardrail deflection rather than mistakenly interpreting outside queries as transactions.
     - Added local offline answers for Tenvi-specific feature queries (Current Unbilled Cycle, Billing Cut-offs, Receivables / Pautang loans, Bill Splits, Statement Uploads).
  4. **Automated Verification**:
     - Unit & integration test suite ([`test_ai_guardrails_and_markdown.ts`](file:///Users/jeunciano/Workstation/Bili/scratch/test_ai_guardrails_and_markdown.ts)) confirmed 10/10 outside topic queries blocked, 11/11 financial queries permitted, and markdown HTML elements verified.
     - Live Gemini GenAI test ([`test_gemini_guardrail_online.ts`](file:///Users/jeunciano/Workstation/Bili/scratch/test_gemini_guardrail_online.ts)) confirmed online intent classification produces `out_of_bounds` for non-financial prompts.


---

### 8.32 Money In & Money Out Feed: Current-to-Oldest Ordering & Future Date Exclusion
- **User Requirement**: *"in money in money out list transaction, display from current date to oldest, current on top dont display the future dates"*
- **Architecture & Implementation Details**:
  1. **Strict Future Date Exclusion**:
     - Future-dated installment transactions (such as placeholder rows for future loan schedules or installment months) are now strictly excluded from the active Money In & Money Out ledger feed.
     - In [`page.tsx`](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/transactions/page.tsx), applied `.lte('occurred_on', todayISO)` directly on the database query using the current local Philippine date (`Asia/Manila`).
     - In [`TransactionsClient.tsx`](file:///Users/jeunciano/Workstation/Bili/src/components/Forms/TransactionModal.tsx), applied client-side guard `t.occurred_on <= todayISO` so that dynamically added or revalidated items never display future dates.
  2. **Chronological Ordering (Current on Top to Oldest)**:
     - Sorted transactions descending by date (`occurred_on DESC`) with current date at the very top.
     - Secondary sort by `created_at DESC` ensures multiple transactions occurring on the same day are cleanly ordered with the most recent transaction on top.
  3. **Dashboard Overview Alignment**:
     - In [`src/app/dashboard/page.tsx`](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/page.tsx) and [`DashboardOverviewClient.tsx`](file:///Users/jeunciano/Workstation/Bili/src/app/dashboard/DashboardOverviewClient.tsx), updated the Recent Transactions widget to use `recentTransactions` filtered to `t.occurred_on <= todayISO`, ensuring the overview widget also displays current transactions on top and omits future installment placeholders.
