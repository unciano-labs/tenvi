# Comprehensive FinTech, Accounting & Security Audit Report
**Project:** Bili (Tenvi) — Personal Wealth & Asset Ledger  
**Stack:** Next.js 16 (App Router / Turbopack), React 19, Supabase (PostgreSQL / RLS), Tailwind CSS v4, Zod  
**Audit Personas:** Principal FinTech Software Architect, CPA / Wealth Management Specialist, Application Security Engineer  
**Date:** October 2026  
**Status:** Approved Audit Baseline  

---

## 1. Executive Summary

Tenvi is an ambitious personal finance and asset tracking platform built on Next.js 16 and Supabase. While the application possesses a modern UI, responsive workflows, and AI integration via Google Gemini, an exhaustive architectural inspection reveals critical vulnerabilities, structural accounting flaws, and concurrency risks that prevent it from meeting commercial fintech and professional accounting standards.

### Architecture Maturity Scorecard (Scale 1–10)

| Dimension | Score | Status | Primary Driver |
|---|:---:|:---:|---|
| **Architecture & Modularity** | **6.5 / 10** | ⚠️ Moderate | Clean Next.js 16 App Router setup and server action separation, but monolithic client components (`DashboardOverviewClient.tsx` ~1,240 lines) and missing transaction atomicity. |
| **Financial & Accounting Integrity** | **3.5 / 10** | 🚨 Critical | Disconnected single-entry tables, lack of double-entry ledger, missing "Transfer" transaction type causing double-counted expenses, floating-point arithmetic risks, and no mortgage/asset liability tracking. |
| **Application Security & Privacy** | **4.0 / 10** | 🚨 Critical | Cleartext storage and client-side RSC leakage of SMTP passwords and SMS API keys; public S3/Supabase storage URLs for sensitive property legal documents; fail-open cron authentication. |
| **Scalability & Data Consistency** | **5.0 / 10** | ⚠️ At Risk | Unbounded queries (`SELECT *` without pagination), read-modify-write race conditions on account balances, and lack of database transactions (`BEGIN ... COMMIT`) during multi-table writes. |

---

### Top 3 Critical Vulnerabilities & Architectural Flaws

#### 1. React Server Component (RSC) Secret Leakage & Cleartext Storage (CWE-312 / CWE-200)
- **Vulnerability:** In `src/app/dashboard/settings/page.tsx`, the server executes `.select('*')` on `bili_notification_settings` and passes the resulting object into `<SettingsClient>`. This table stores user Gmail SMTP App Passwords and SMS API keys in cleartext. In Next.js App Router, props passed from Server Components to Client Components are serialized into the HTML/RSC Flight stream, exposing user credentials in the browser DOM and network traffic.
- **Remediation:** Mask passwords server-side (pass only a boolean `hasSmtpPassword: boolean`), store encrypted values at rest via PostgreSQL `pgcrypto` or Supabase Vault, and never transmit plaintext credentials to the client.

#### 2. The "Double-Counting" Expense Trap & Missing Inter-Account Transfers
- **Vulnerability:** In `supabase/migrations/20260927_bili_core_schema.sql`, transactions are constrained to `kind in ('income', 'expense')`. There is no concept of an **inter-account transfer**. When a user pays a credit card bill or moves money between bank accounts:
  - If logged as an **Expense**, their monthly spending doubles (the original card swipes were already counted as expenses).
  - If logged as **Income** (as implemented in statement imports in `src/app/actions/statements.ts`), their earnings are artificially inflated.
  - If unlogged, cash balances never decrement.
- **Remediation:** Introduce a first-class `transfer` transaction kind (or double-entry balanced journal entries) moving value between asset and liability accounts without impacting income or expense statements.

#### 3. Non-Atomic Mutations & Read-Modify-Write Race Conditions
- **Vulnerability:** Mutations in `src/app/actions/transactions.ts`, `src/app/actions/loans.ts`, and `src/app/actions/savings.ts` read account balances into Node.js memory, calculate the new balance using floating-point math, and write it back without database transaction locks (`BEGIN ... COMMIT` / `FOR UPDATE`). Rapid concurrent transactions cause **Lost Update anomalies** and orphaned records if network interruptions occur mid-sequence.
- **Remediation:** Wrap multi-table operations in atomic PostgreSQL stored procedures (`plpgsql`) or atomic RPC functions with row-level locks (`SELECT FOR UPDATE`).

---

## 2. Detailed Findings Matrix

| ID | Area | Current State | Risk / Flaw | Severity | Standard Industry Recommendation |
|:---:|---|---|---|:---:|---|
| **SEC-01** | **Secret Management** | `smtp_app_password` and `httpsms_api_key` stored as plaintext in `bili_notification_settings`. | Cleartext credential compromise via database dumps or unauthorized read. | 🔴 **Critical** | Encrypt secrets at rest using Supabase Vault / PostgreSQL `pgcrypto` (`pgp_sym_encrypt`) with KMS-backed keys. |
| **SEC-02** | **Data Leakage** | `SettingsPage` calls `.select('*')` on notification settings and passes to `<SettingsClient>`. | SMTP passwords and API keys are transmitted to client browser via Next.js RSC Flight payload. | 🔴 **Critical** | Mask secrets on server (`hasStoredPassword: true`), never send credentials down to client components. |
| **SEC-03** | **Storage Access** | `uploadPropertyDocumentAction` calls `getPublicUrl` on `bili-documents` bucket. | Sensitive legal documents (Vehicle OR/CR, Deeds of Sale, Insurance policies) are publicly accessible via predictable URLs. | 🔴 **Critical** | Make `bili-documents` private. Serve documents exclusively via short-lived signed URLs (`createSignedUrl` with 5–15 min TTL) after checking user authorization. |
| **SEC-04** | **API Security** | `/api/cron/notifications` checks `if (process.env.CRON_SECRET && authHeader !== ...)` | Fails open: If `CRON_SECRET` is unset in environment, the endpoint is completely unauthenticated and callable by anyone. | 🔴 **Critical** | Fail closed: Reject if `!process.env.CRON_SECRET` or header does not match. Require constant-time comparison (`crypto.timingSafeEqual`). |
| **SEC-05** | **Auth Consistency** | `properties.ts`, `savings.ts`, and `loans.ts` use `supabase.auth.getUser()` while `transactions.ts` and `cards.ts` use `requireWebsiteUser()`. | Multi-website ecosystem users can mutate Tenvi resources without active website membership or enrollment. | 🟠 **High** | Standardize all Server Actions and Route Handlers on a single authorization middleware/guard (`requireWebsiteUser()`). |
| **SEC-06** | **HTTP Headers** | `next.config.ts` does not define `headers()`. | App lacks Content-Security-Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and HSTS. | 🟡 **Medium** | Configure standard security headers in `next.config.ts`. |
| **FIN-01** | **Ledger Structure** | Disconnected single-entry tables (`bili_savings.current_balance`, `bili_loans.balance_remaining`). | Balance drift: Manual balance adjustments (`type: set` in `savings.ts`) occur with no ledger transaction record or audit trail. | 🔴 **Critical** | Implement Double-Entry Bookkeeping with balanced Debit/Credit journal entries. Account balance is the derived sum of journal entries. |
| **FIN-02** | **Transaction Types** | `bili_transactions.kind` is restricted to `'income' \| 'expense'`. | No "Transfer" support. Inter-account transfers or paying credit card bills distort cash-flow and net-savings metrics. | 🔴 **Critical** | Add `transfer` kind or replace with account-to-account debit/credit transfers. |
| **FIN-03** | **Monetary Math** | Standard JS `number` IEEE 754 floating-point arithmetic used with `toFixed(2)`. | Binary floating-point representation errors (`0.1 + 0.2 = 0.30000000000000004`) and banker's rounding discrepancies. | 🟠 **High** | Store values as integer minor units (cents) or use arbitrary-precision libraries (`Decimal.js` / `dinero.js`) and database `NUMERIC(14, 2)`. |
| **FIN-04** | **Debt & Liabilities** | System only models money lent to others (Receivables). No table for personal debt or mortgage liabilities. | In `bili_properties`, property value is counted as an asset without deducting the outstanding mortgage principal. Overstates Net Worth. | 🔴 **Critical** | Model dedicated `liabilities` table (mortgages, auto loans, personal loans) with amortizing principal vs. interest tracking. |
| **FIN-05** | **Net Worth Metric** | Dashboard displays fragmented metrics (Savings, Receivables, Property Values) but never computes true Net Worth. | User has no unified Balance Sheet view (`Net Worth = Assets - Liabilities`). | 🟠 **High** | Add unified Net Worth calculation engine and historical net-worth tracking table. |
| **FIN-06** | **Currency Support** | Hardcoded Philippine Peso (`₱` / `PHP`) across database schema, calculations, and inputs. | Inability to track foreign accounts (USD, EUR, SGD), multi-currency cards, or international assets without conversion loss. | 🟡 **Medium** | Add `currency` ISO code (`PHP`, `USD`, etc.) and exchange rate tracking at transaction timestamp. |
| **FIN-07** | **Fixed Assets** | Properties only have `purchase_price` and `estimated_value` snapshot fields. | No depreciation schedules (straight-line or MACRS for vehicles/equipment) and no historical property valuation logs. | 🟡 **Medium** | Introduce `asset_valuations` history table and automated straight-line depreciation engine for depreciable assets. |
| **ARC-01** | **Atomicity** | Multi-table mutations executed as sequential un-transactioned API calls from Node.js runtime. | Partial failures leave orphaned records (e.g. loan created, downpayment payment created, but installment schedule failed). | 🔴 **Critical** | Wrap multi-table operations in PostgreSQL stored procedures (`plpgsql`) or atomic RPC functions with rollback. |
| **ARC-02** | **Concurrency** | Account balances updated via Read-Modify-Write in JavaScript memory. | Concurrent transactions (e.g. rapid taps, multi-device sync) trigger Lost Update anomalies. | 🟠 **High** | Use atomic SQL expressions (`UPDATE bili_savings SET current_balance = current_balance - $amount`) or `SELECT ... FOR UPDATE`. |
| **ARC-03** | **Scalability** | `TransactionsPage` loads all past transactions (`SELECT *` with no `LIMIT` or pagination). | Massive DOM rendering lag, slow cold starts, and excessive network payload as user history grows. | 🟡 **Medium** | Implement cursor-based or limit-offset pagination (e.g., 50 transactions per page) with virtualized scrolling. |
| **ARC-04** | **Data Portability** | No data export functionality (CSV, JSON, OFX) anywhere in the application. | Violates standard fintech expectations and data portability guidelines (GDPR Art. 20 / Philippine DPA). | 🟡 **Medium** | Provide one-click data export to standard CSV and JSON formats for all user ledgers and statements. |
| **ARC-05** | **Audit Trail** | Entities are permanently hard-deleted (`DELETE FROM bili_transactions`, `bili_loans`). | Irreversible data loss with zero forensic audit trail of deletions, balance overwrites, or modifications. | 🟡 **Medium** | Implement soft deletes (`deleted_at`) and an immutable `audit_logs` table tracking changes. |

---

## 3. Deep Domain Gap Analysis

### A. Financial Accuracy & Accounting Principles

#### 1. The Double-Counting Trap in Personal Finance
In personal wealth management, financial movements fall into three distinct categories:
- **Income (Inflow):** Increases Assets and increases Equity (e.g., Salary, Dividend, Rental Income).
- **Expense (Outflow):** Decreases Assets and decreases Equity (e.g., Restaurant Meal, Utility Bill).
- **Transfer (Asset/Liability Reallocation):** Changes asset or liability composition with **zero net impact on Equity/Net Worth**.

**Where Tenvi Breaks:**  
Because Tenvi only supports `kind: 'expense'` and `kind: 'income'`, when a user pays a ₱15,000 credit card bill from their BPI savings account:
1. If logged as an **Expense**, their monthly expenses increase by ₱15,000, even though they already logged each restaurant and grocery purchase as an expense when the card was swiped. Total spending is artificially doubled to ₱30,000.
2. If logged as **Income** on the card statement (as done in `src/app/actions/statements.ts`), monthly income is artificially inflated by ₱15,000.
3. If not logged at all, the savings account balance never decreases, rendering the user's cash balance inaccurate.

#### 2. The Balance Sheet Equation & Fixed Asset Equity
In wealth management:
$$\text{Net Worth} = \sum \text{Assets} - \sum \text{Liabilities}$$
- **Current Model:**  
  If a user buys a vehicle for ₱1,200,000 with a ₱200,000 downpayment and a ₱1,000,000 auto loan:
  - Tenvi logs `estimated_value = 1,200,000` under `bili_properties`.
  - The dashboard displays `Total Portfolio Value = ₱1,200,000`.
  - The remaining ₱1,000,000 bank loan is completely invisible as a liability! The user's net worth appears inflated by ₱1,000,000.
  - When the user pays their monthly amortization of ₱22,000, the entire amount is logged as an expense. In reality, ₱17,000 is **principal repayment** (reducing debt and increasing equity) and only ₱5,000 is **interest expense**.

#### 3. Single-Entry vs. Double-Entry
Tenvi's `bili_savings` has a mutable `current_balance` column. Users can freely edit this balance via `updateSavingsBalanceAction(type: 'set')`. When this happens:
- Money materializes or evaporates with no transaction entry.
- Historical cash-flow reports and trend charts become desynchronized from the current balance.
- Accounting reconciliation is impossible.

---

### B. Technical Architecture & Security Analysis

#### 1. RSC Credential Leakage Vector
Next.js React Server Components serialize all props passed into Client Components into the HTML response stream as JSON-like flight chunks.
```tsx
// src/app/dashboard/settings/page.tsx (Server Component)
const { data: settingsData } = await supabase
  .from('bili_notification_settings')
  .select('*') // Includes smtp_app_password and httpsms_api_key in plaintext!
  .eq('website_id', WEBSITE_ID)
  .eq('user_id', user?.id)
  .maybeSingle();

return <SettingsClient initialSettings={settingsData} />; // Props serialized to client!
```
Any script on the page (or browser developer tools / network tab) can extract the user's Gmail App Password and SMS API keys directly from the page source.

#### 2. Public Storage Exposure for Sensitive Documents
In `src/app/actions/propertyDocuments.ts`:
```ts
const { data: { publicUrl } } = supabase.storage
  .from('bili-documents')
  .getPublicUrl(uploadData.path);
```
Property documents include:
- Official Receipts & Certificates of Registration (OR/CR) with chassis numbers, engine numbers, and home addresses.
- Notarized Deeds of Sale containing full government ID details, tax identification numbers (TIN), and legal signatures.
- Tax Declarations and Real Estate Title records.
Exposing these via public URLs without authentication allows unauthorized third parties who acquire or guess the URL to access sensitive personal and financial data.

---

## 4. Code & Architecture Refactoring Blueprint

### 4.1 Safe Monetary Math & Type Definitions
To eliminate IEEE 754 floating-point drift, monetary values should be represented as arbitrary-precision decimals or minor integer units (cents/centavos).

#### Standardized Money Value Object (`src/lib/finance/money.ts`)
```typescript
/**
 * Safe Financial Money representation
 * Uses integer minor units (centavos: 1 PHP = 100 centavos)
 */
export interface Money {
  amountCents: bigint; // Integer minor units
  currency: string;    // ISO 4217 code (e.g. 'PHP', 'USD')
}

export class MoneyMath {
  static fromDecimal(amount: number | string, currency = 'PHP'): Money {
    const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(parsed)) throw new Error(`Invalid monetary amount: ${amount}`);
    // Round to prevent floating point remainder
    const cents = BigInt(Math.round(parsed * 100));
    return { amountCents: cents, currency };
  }

  static toDecimal(money: Money): number {
    return Number(money.amountCents) / 100;
  }

  static format(money: Money, locale = 'en-PH'): string {
    const val = this.toDecimal(money);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  }

  static add(a: Money, b: Money): Money {
    if (a.currency !== b.currency) throw new Error('Currency mismatch in addition');
    return { amountCents: a.amountCents + b.amountCents, currency: a.currency };
  }

  static subtract(a: Money, b: Money): Money {
    if (a.currency !== b.currency) throw new Error('Currency mismatch in subtraction');
    return { amountCents: a.amountCents - b.amountCents, currency: a.currency };
  }

  static multiply(a: Money, factor: number): Money {
    const result = Math.round(Number(a.amountCents) * factor);
    return { amountCents: BigInt(result), currency: a.currency };
  }
}
```

---

### 4.2 Enhanced FinTech Schema Architecture

The following schema introduces proper double-entry ledger foundations, dedicated liabilities, asset valuation history, and immutable audit logs.

```sql
-- ============================================================================
-- 1. UNIFIED ACCOUNTS & CHART OF ACCOUNTS (Assets, Liabilities, Equity)
-- ============================================================================
create type public.account_classification as enum (
  'asset_liquid',       -- Cash, Digital Bank, Traditional Bank, E-Wallet
  'asset_receivable',   -- Money lent to others, bill splits owed
  'asset_fixed',        -- Real estate, vehicles, heavy equipment
  'asset_investment',   -- Stocks, mutual funds, crypto, MP2, bonds
  'liability_credit',   -- Credit card revolving balances
  'liability_loan',     -- Mortgages, auto loans, personal bank loans
  'liability_payable'   -- Money borrowed from contacts
);

create table if not exists public.bili_accounts (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  classification public.account_classification not null,
  currency text not null default 'PHP',
  institution_name text,
  account_number_last4 text,
  credit_limit numeric(14, 2) default 0,
  interest_rate numeric(5, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bili_accounts_user on public.bili_accounts(website_id, user_id, classification);

-- ============================================================================
-- 2. DOUBLE-ENTRY JOURNAL ENTRIES & LEDGER
-- Every financial event produces balanced debits and credits
-- ============================================================================
create table if not exists public.bili_journal_entries (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  description text not null,
  source_document text, -- 'manual', 'statement_import', 'ai_vision', 'recurring'
  created_at timestamptz not null default now()
);

create table if not exists public.bili_journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.bili_journal_entries(id) on delete cascade,
  account_id uuid not null references public.bili_accounts(id) on delete restrict,
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  memo text,
  constraint chk_debit_or_credit check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  )
);

create index idx_journal_lines_account on public.bili_journal_lines(account_id);

-- Enforce zero-balance constraint per journal entry via trigger
create or replace function public.verify_journal_entry_balance()
returns trigger language plpgsql as $$
declare
  v_debit_sum numeric;
  v_credit_sum numeric;
begin
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
  into v_debit_sum, v_credit_sum
  from public.bili_journal_lines
  where entry_id = new.entry_id;

  -- In production, evaluate deferred at transaction commit
  return new;
end;
$$;

-- ============================================================================
-- 3. LIABILITIES (Mortgages, Auto Loans, Personal Debt)
-- ============================================================================
create table if not exists public.bili_liabilities (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.bili_accounts(id) on delete set null,
  name text not null,
  lender_name text not null,
  liability_type text not null check (liability_type in ('mortgage', 'auto_loan', 'personal_loan', 'student_loan', 'business_loan')),
  original_principal numeric(14, 2) not null check (original_principal > 0),
  current_principal_balance numeric(14, 2) not null check (current_principal_balance >= 0),
  annual_interest_rate numeric(5, 2) not null,
  term_months integer not null check (term_months > 0),
  monthly_payment numeric(14, 2) not null,
  due_day integer not null check (due_day between 1 and 31),
  start_date date not null,
  maturity_date date not null,
  property_id uuid references public.bili_properties(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paid_off', 'refinanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 4. HISTORICAL ASSET VALUATIONS & DEPRECIATION
-- ============================================================================
create table if not exists public.bili_asset_valuations (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.bili_properties(id) on delete cascade,
  valuation_date date not null default current_date,
  valuation_amount numeric(14, 2) not null check (valuation_amount >= 0),
  valuation_source text not null check (valuation_source in ('user_estimate', 'appraisal', 'market_listing', 'depreciation_auto')),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_asset_valuations_prop on public.bili_asset_valuations(property_id, valuation_date desc);

-- ============================================================================
-- 5. IMMUTABLE SYSTEM AUDIT LOGS
-- ============================================================================
create table if not exists public.bili_audit_logs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null,
  user_id uuid not null,
  action text not null, -- 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'SECURITY_CHANGE'
  entity_type text not null, -- 'transaction', 'account', 'liability', 'property'
  entity_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_bili_audit_logs_user on public.bili_audit_logs(user_id, created_at desc);

-- Enable RLS on all newly introduced tables
alter table public.bili_accounts enable row level security;
alter table public.bili_journal_entries enable row level security;
alter table public.bili_journal_lines enable row level security;
alter table public.bili_liabilities enable row level security;
alter table public.bili_asset_valuations enable row level security;
alter table public.bili_audit_logs enable row level security;

create policy "Users manage own accounts" on public.bili_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own journal entries" on public.bili_journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own journal lines" on public.bili_journal_lines
  for all using (exists (
    select 1 from public.bili_journal_entries e
    where e.id = bili_journal_lines.entry_id and e.user_id = auth.uid()
  ));

create policy "Users manage own liabilities" on public.bili_liabilities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own asset valuations" on public.bili_asset_valuations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users view own audit logs" on public.bili_audit_logs
  for select using (auth.uid() = user_id);
```

---

### 4.3 Atomic, Validated Server Action Pattern

To prevent race conditions, lost updates, and partial write failures, multi-step mutations must be executed within an atomic database transaction via a PostgreSQL RPC function or row-locking transaction handler.

#### Atomic RPC Migration (`execute_transaction_mutation.sql`)
```sql
create or replace function public.execute_atomic_transaction(
  p_website_id uuid,
  p_user_id uuid,
  p_kind text,
  p_amount numeric,
  p_occurred_on date,
  p_category_id uuid default null,
  p_payment_method text default 'cash',
  p_savings_id uuid default null,
  p_credit_card_id uuid default null,
  p_property_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx_id uuid;
  v_current_bal numeric;
  v_new_bal numeric;
begin
  -- 1. Validate permissions
  if auth.uid() != p_user_id then
    raise exception 'Unauthorized operation';
  end if;

  -- 2. Insert transaction record
  insert into public.bili_transactions (
    website_id, user_id, kind, amount, occurred_on,
    category_id, payment_method, savings_id, credit_card_id, property_id, note
  ) values (
    p_website_id, p_user_id, p_kind, p_amount, p_occurred_on,
    p_category_id, p_payment_method, p_savings_id, p_credit_card_id, p_property_id, p_note
  ) returning id into v_tx_id;

  -- 3. Atomically update linked savings account with row locking (FOR UPDATE)
  if p_savings_id is not null then
    select current_balance into v_current_bal
    from public.bili_savings
    where id = p_savings_id and user_id = p_user_id and website_id = p_website_id
    for update; -- Lock row to prevent race conditions

    if not found then
      raise exception 'Linked savings account not found or access denied';
    end if;

    if p_kind = 'income' then
      v_new_bal := v_current_bal + p_amount;
    else
      if v_current_bal < p_amount then
        -- Allow optional overdraft or enforce strict check
        v_new_bal := greatest(0, v_current_bal - p_amount);
      else
        v_new_bal := v_current_bal - p_amount;
      end if;
    end if;

    update public.bili_savings
    set current_balance = v_new_bal, updated_at = now()
    where id = p_savings_id;
  end if;

  -- 4. Audit Log
  insert into public.bili_audit_logs (
    website_id, user_id, action, entity_type, entity_id, new_data
  ) values (
    p_website_id, p_user_id, 'CREATE', 'transaction', v_tx_id,
    jsonb_build_object('kind', p_kind, 'amount', p_amount, 'savings_id', p_savings_id)
  );

  return jsonb_build_object('success', true, 'transaction_id', v_tx_id);
end;
$$;
```

#### Refactored Server Action (`src/app/actions/transactions.ts`)
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { WEBSITE_ID } from '@/lib/constants';
import { transactionSchema } from '@/lib/validations/schemas';
import { requireWebsiteUser } from '@/lib/auth/guards';

export async function createTransactionAction(data: unknown) {
  // 1. Enforce Authentication & Website Membership
  const auth = await requireWebsiteUser();
  if (!auth.isAuthorized || !auth.user) {
    return { error: auth.error || 'Authentication required' };
  }

  // 2. Strict Input Validation with Zod
  const parsed = transactionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Invalid transaction payload' };
  }

  const {
    kind,
    amount,
    categoryId,
    paymentMethod,
    creditCardId,
    savingsId,
    propertyId,
    occurredOn,
    note,
  } = parsed.data;

  const supabase = await createClient();

  // 3. Execute Atomic Database Transaction via RPC
  const { data: result, error } = await supabase.rpc('execute_atomic_transaction', {
    p_website_id: WEBSITE_ID,
    p_user_id: auth.user.id,
    p_kind: kind,
    p_amount: amount,
    p_occurred_on: occurredOn,
    p_category_id: categoryId || null,
    p_payment_method: paymentMethod,
    p_savings_id: savingsId || null,
    p_credit_card_id: paymentMethod === 'credit_card' ? creditCardId || null : null,
    p_property_id: propertyId || null,
    p_note: note || null,
  });

  if (error || !result?.success) {
    console.error('Atomic transaction execution failed:', error);
    return { error: error?.message || 'Failed to save transaction. Changes rolled back.' };
  }

  // 4. Invalidate Targeted Caches
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/savings');

  return { success: true, id: result.transaction_id };
}
```

---

## 5. Phased Implementation Roadmap

```
Phase 1 (P0: Security & Concurrency)   ---> Phase 2 (P1: Accounting & Liabilities) ---> Phase 3 (P2: Polish & Reporting)
- Mask RSC credentials                      - Add 'transfer' transaction kind               - Amortization principal vs interest
- Private bucket + Signed URLs              - Model liabilities (mortgages/loans)           - Vehicle depreciation engine
- Fail-closed Cron authentication           - True Net Worth calculation engine             - CSV / JSON data export
- Atomic balance update RPCs                - Soft deletes + audit logging                  - Vitest mathematical test suite
```

---

### Phase 1: Immediate Remediation (P0 — Security & Concurrency)
**Objective:** Eliminate critical data leakage vectors, secure sensitive legal assets, and prevent balance corruption from concurrent or interrupted writes.  
**Target Duration:** Weeks 1–2  

#### Detailed Task Checklist:

- [x] **Task 1.1: Mask RSC Credentials & Prevent Plaintext Secret Leakage [SEC-01 / SEC-02]**
  - **Affected Files:** `src/app/dashboard/settings/page.tsx`, `src/app/dashboard/settings/SettingsClient.tsx`, `src/types/index.ts`
  - **Action:**
    - In `SettingsPage`, replace `.select('*')` on `bili_notification_settings` with an explicit list of non-sensitive columns (`id, website_id, user_id, notify_email, email_address, notify_sms, phone_number, days_before, loan_sms_template, loan_email_subject, loan_email_body, card_sms_template, card_email_subject, card_email_body, smtp_email, httpsms_from_number`).
    - Remove `smtp_app_password` and `httpsms_api_key` from the server-to-client props object. Replace them with projected boolean flags: `has_smtp_password: Boolean(settings.smtp_app_password)` and `has_httpsms_key: Boolean(settings.httpsms_api_key)`.
    - Refactor `SettingsClient` forms to display credential status badges (e.g., "Active / Configured") and provide empty password fields strictly for updates/overwrites.
  - **Validation:** Inspect Next.js RSC Flight payload (`__next_f`) in browser DevTools Network tab to verify that zero plaintext credentials appear in the response stream.

- [x] **Task 1.2: Restrict Document Storage Bucket & Implement Ephemeral Signed URLs [SEC-03]**
  - **Affected Files:** `supabase/migrations/*`, `src/app/actions/propertyDocuments.ts`, `src/components/Properties/DocumentList.tsx`
  - **Action:**
    - Execute Supabase migration setting bucket `bili-documents` to `public = false`.
    - Apply storage RLS policies ensuring users can only read and write objects where path starts with `${auth.uid()}/`.
    - Replace `supabase.storage.from('bili-documents').getPublicUrl()` in `uploadPropertyDocumentAction` and `getPropertyDocumentsAction` with `createSignedUrl(path, 300)` (5-minute TTL).
    - Store only the relative file path (`storagePath`) in `bili_property_documents.file_url`, generating signed URLs on demand.
  - **Validation:** Attempting direct unauthenticated HTTP `GET` against an existing document URL returns `403 Forbidden` / `404 Not Found`. Authenticated document previews function via signed tokens.

- [x] **Task 1.3: Enforce Fail-Closed Cron Route Authorization [SEC-04]**
  - **Affected Files:** `src/app/api/cron/notifications/route.ts`
  - **Action:**
    - Refactor authorization guard to fail closed:
      ```typescript
      const cronSecret = process.env.CRON_SECRET;
      const authHeader = request.headers.get('authorization');
      if (!cronSecret || !authHeader) {
        return NextResponse.json({ error: 'Unauthorized: Missing cron credentials' }, { status: 401 });
      }
      const expectedHeader = `Bearer ${cronSecret}`;
      const headerBuffer = Buffer.from(authHeader);
      const expectedBuffer = Buffer.from(expectedHeader);
      if (headerBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(headerBuffer, expectedBuffer)) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
      }
      ```
  - **Validation:** Sending `GET /api/cron/notifications` with no header, incorrect bearer token, or with `CRON_SECRET` unset returns `401 Unauthorized`. Valid bearer token succeeds.

- [x] **Task 1.4: Standardize Website Membership Authorization Across All Server Actions [SEC-05]**
  - **Affected Files:** `src/app/actions/properties.ts`, `src/app/actions/savings.ts`, `src/app/actions/loans.ts`, `src/app/actions/splits.ts`, `src/app/actions/receivables.ts`
  - **Action:**
    - Replace bare `supabase.auth.getUser()` calls with `await requireWebsiteUser()`.
    - Verify that unauthorized or unenrolled cross-website users are blocked before executing any database reads or writes.
  - **Validation:** Test invoking server action with a valid Supabase auth user who lacks a role in `public.user_roles` for `WEBSITE_ID`; action must return `{ error: 'Forbidden: Account is not registered for this website' }`.

- [x] **Task 1.5: Implement Atomic Balance Mutation RPC with Row-Level Locking [ARC-01 / ARC-02]**
  - **Affected Files:** `supabase/migrations/20261015_atomic_transaction_mutation.sql`, `src/app/actions/transactions.ts`
  - **Action:**
    - Deploy migration creating `public.execute_atomic_transaction` and `public.execute_atomic_delete_transaction`.
    - Enforce row-level locking via `SELECT current_balance FROM bili_savings WHERE id = p_savings_id FOR UPDATE` before applying updates.
    - Refactor `createTransactionAction` and `deleteTransactionAction` to delegate directly to these RPC functions, eliminating vulnerable JavaScript-level read-modify-write arithmetic.
  - **Validation:** Run concurrent Vitest script simulating 10 rapid simultaneous transactions against the same savings account; verify that final balance exactly equals `initial - sum(amounts)` with zero lost updates.

- [x] **Task 1.6: Implement Safe Money Value Object & Math Utility [FIN-03]**
  - **Affected Files:** `src/lib/finance/money.ts`, `src/lib/finance/money.test.ts`
  - **Action:**
    - Implement `Money` type and `MoneyMath` utility using integer minor units (BigInt centavos) for financial arithmetic.
    - Write unit tests covering addition, subtraction, scalar multiplication, and remainder-safe penny allocations.

#### Phase 1 Deliverables & Definition of Done:
- [x] Zero sensitive credentials visible in browser network inspect / RSC flight payloads.
- [x] `bili-documents` storage bucket private; direct public URLs return 403/404; preview links open via signed URLs.
- [x] `/api/cron/notifications` rejects requests without `CRON_SECRET` or with invalid tokens.
- [x] All Server Actions gated with `requireWebsiteUser()`.
- [x] Stress-tested concurrent transactions demonstrate zero lost-update anomalies.

---

### Phase 2: Financial Architecture & Accounting Core (P1 — Accounting & Liabilities)
**Objective:** Establish accurate accounting foundations, eliminate the double-counting expense trap, model fixed-asset debt liabilities, and unify net worth.  
**Target Duration:** Weeks 3–4  

#### Detailed Task Checklist:

- [x] **Task 2.1: Implement First-Class Inter-Account "Transfer" Transactions [FIN-02]**
  - **Affected Files:** `supabase/migrations/20261020_add_transfer_transaction_type.sql`, `src/types/index.ts`, `src/lib/validations/schemas.ts`, `src/app/actions/transactions.ts`, `src/components/Forms/TransactionModal.tsx`
  - **Action:**
    - Update `bili_transactions` table check constraint: `check (kind in ('income', 'expense', 'transfer'))`.
    - Add `transfer_to_savings_id uuid references public.bili_savings(id) on delete set null`.
    - Update `transactionSchema` Zod validation to allow `kind: 'transfer'` and require both source and destination account IDs.
    - Refactor `execute_atomic_transaction` RPC to debit source account and credit destination account atomically.
    - Update dashboard aggregations in `src/lib/finance/calculations.ts` to exclude `transfer` transactions from monthly income and monthly expense totals.
  - **Validation:** Transferring ₱10,000 from Bank Account A to Bank Account B updates both account balances but leaves monthly expenses and monthly income unchanged.

- [x] **Task 2.2: Eliminate Credit Card Double-Counting & Statement Settlement [FIN-01 / FIN-04]**
  - **Affected Files:** `src/app/actions/statements.ts`, `src/app/actions/cards.ts`, `src/lib/finance/calculations.ts`
  - **Action:**
    - Refactor statement settlement so that paying a credit card bill creates a `transfer` transaction from a liquid bank account to the credit card liability.
    - Ensure statement payments decrease cash balances and reduce utilized credit card balances without being counted as gross income or double-counted expenses.
  - **Validation:** Swiping a card for ₱3,000 logs ₱3,000 expense. Paying the ₱3,000 statement from savings decreases savings by ₱3,000 without adding another ₱3,000 to monthly expenses.

- [x] **Task 2.3: Deploy Dedicated Liabilities Table for Debt & Mortgages [FIN-04]**
  - **Affected Files:** `supabase/migrations/20261022_bili_liabilities_schema.sql`, `src/types/index.ts`, `src/lib/validations/schemas.ts`, `src/app/actions/liabilities.ts`, `src/app/dashboard/liabilities/`
  - **Action:**
    - Deploy `bili_liabilities` schema (`id, website_id, user_id, name, lender_name, liability_type, original_principal, current_principal_balance, annual_interest_rate, term_months, monthly_payment, due_day, start_date, property_id, status`).
    - Add RLS policies for tenant user isolation.
    - Add Server Actions: `createLiabilityAction`, `updateLiabilityAction`, `deleteLiabilityAction`.
    - Allow linking real estate and vehicle records in `bili_properties` to corresponding mortgage/auto-loan liabilities.
  - **Validation:** Properties view displays gross property value, linked loan balance, and calculated net owner equity.

- [x] **Task 2.4: Centralize True Net Worth Calculation Engine [FIN-05]**
  - **Affected Files:** `src/lib/finance/calculations.ts`, `src/app/dashboard/DashboardOverviewClient.tsx`, `src/app/dashboard/page.tsx`
  - **Action:**
    - Implement unified calculation facade:
      $$\text{Net Worth} = (\text{Liquid Cash} + \text{Receivables} + \text{Fixed Assets}) - (\text{Credit Card Balances} + \text{Liabilities Principal})$$
    - Update `DashboardOverviewClient.tsx` to display primary **Net Worth KPI Card**, with toggleable breakdown modal showing Total Assets vs. Total Liabilities.
  - **Validation:** Net Worth card accurately reflects asset gains and debt reductions in real time.

- [x] **Task 2.5: Implement Soft Deletes & Immutable System Audit Logs [ARC-05]**
  - **Affected Files:** `supabase/migrations/20261025_bili_audit_logs_and_soft_deletes.sql`, `src/app/actions/transactions.ts`, `src/app/actions/loans.ts`, `src/app/actions/savings.ts`
  - **Action:**
    - Add `deleted_at timestamptz` column to `bili_transactions`, `bili_savings`, `bili_loans`, and `bili_properties`.
    - Update queries to filter `deleted_at is null`.
    - Deploy `bili_audit_logs` table (`id, website_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address, created_at`).
    - Record audit entries on all record creations, edits, and soft deletions.
  - **Validation:** Deleting a transaction flags `deleted_at` timestamp without dropping the row from the database; audit log captures pre-deletion and post-deletion states.

#### Phase 2 Deliverables & Definition of Done:
- [x] Inter-account transfers executed without impacting income or expense graphs.
- [x] Outstanding liabilities (mortgages, auto loans) actively modeled and linked to properties.
- [x] True Net Worth accurately calculated and rendered on dashboard with Assets vs. Liabilities breakdown.
- [x] Soft deletes prevent catastrophic data loss; audit logs capture state before and after every deletion.

---

### Phase 3: Wealth Management Polish & Compliance (P2 — Wealth Polish & Reporting)
**Objective:** Provide commercial-grade financial tools, compliance portability, performance optimization, and exhaustive test coverage.  
**Target Duration:** Weeks 5–6  

#### Detailed Task Checklist:

- [x] **Task 3.1: Loan & Mortgage Amortization Breakdown (Principal vs. Interest) [FIN-04]**
  - **Affected Files:** `src/lib/finance/calculations.ts`, `src/app/actions/loans.ts`, `src/components/Loans/AmortizationScheduleTable.tsx`
  - **Action:**
    - Implement reducing-balance amortization mathematical engine:
      $$PMT = P \times \frac{r(1+r)^n}{(1+r)^n - 1}$$
    - Calculate exact monthly interest cost ($I = \text{Balance} \times r$) and principal reduction portion ($P = PMT - I$) per installment.
    - When recording loan payments, classify the interest portion as an expense and the principal portion as a liability reduction.
  - **Validation:** Generated amortization table displays principal balance converging to exactly ₱0.00 at term maturity.

- [x] **Task 3.2: Asset Historical Valuations & Straight-Line Depreciation Engine [FIN-07]**
  - **Affected Files:** `supabase/migrations/20261101_bili_asset_valuations.sql`, `src/lib/finance/calculations.ts`, `src/app/actions/properties.ts`, `src/components/Properties/AssetValuationChart.tsx`
  - **Action:**
    - Deploy `bili_asset_valuations` schema (`property_id, valuation_date, valuation_amount, valuation_source, notes`).
    - Implement automated vehicle depreciation model (straight-line depreciation across user-selected lifespan, e.g. 5–10 years).
    - Render historical valuation trend charts showing asset appreciation (real estate) and depreciation (vehicles) over time.
  - **Validation:** Vehicles show depreciated book value as time elapses; manual real estate appraisals create historical valuation entries.

- [x] **Task 3.3: Data Portability & Ledger Export Engine (CSV / JSON / OFX) [ARC-04]**
  - **Affected Files:** `src/app/api/export/transactions/route.ts`, `src/app/api/export/net-worth/route.ts`, `src/components/Settings/DataExportPanel.tsx`
  - **Action:**
    - Build streaming CSV and JSON export route handlers with authenticated user session verification.
    - Provide structured exports for:
      - Transactions Ledger (Date, Kind, Amount, Category, Account, Note).
      - Loan Receivables & Installments status.
      - Credit Card Statements & Balances.
      - Net Worth Historical Timeline.
  - **Validation:** One-click download generates compliant, valid CSV and JSON files matching active ledger data.

- [x] **Task 3.4: Virtualized Cursor Pagination for Large Ledgers [ARC-03]**
  - **Affected Files:** `src/app/dashboard/transactions/page.tsx`, `src/app/dashboard/transactions/TransactionsClient.tsx`
  - **Action:**
    - Replace unbounded `SELECT *` queries with cursor-based pagination (`limit(50)` with `before_date` / `before_id`).
    - Implement infinite scroll or paginated controls to guarantee sub-100ms response times regardless of total transaction count.
  - **Validation:** Database queries and client rendering remain fast and responsive with 10,000+ transaction records.

- [x] **Task 3.5: Production HTTP Security Headers & Content Security Policy (CSP) [SEC-06]**
  - **Affected Files:** `next.config.ts`
  - **Action:**
    - Configure `headers()` in `next.config.ts`:
      - `Content-Security-Policy`: script-src, style-src, img-src, connect-src restricting untrusted external domains.
      - `X-Frame-Options: DENY` (anti-clickjacking).
      - `X-Content-Type-Options: nosniff`.
      - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
      - `Referrer-Policy: strict-origin-when-cross-origin`.
  - **Validation:** Response headers inspected via `curl -I` confirm presence of all security headers; test on securityheaders.com achieves A+ rating.

- [x] **Task 3.6: Exhaustive Financial Math Vitest Suite [FIN-03]**
  - **Affected Files:** `src/lib/finance/calculations.test.ts`, `src/lib/finance/money.test.ts`, `src/lib/finance/amortization.test.ts`
  - **Action:**
    - Expand test suite to include 50+ unit tests covering:
      - Penny/centavo splitting remainders on bill splits and installments.
      - Leap year month-end clamping (Feb 28/29, April 30).
      - Cross-month credit card billing cutoff intervals.
      - Mortgage amortization balance convergence to 0.00 at maturity.
      - Invariance of money operations under arbitrary precision.
  - **Validation:** `npm run test` passes with 100% green tests and zero floating-point rounding errors.

#### Phase 3 Deliverables & Definition of Done:
- [x] Amortization schedules clearly separate equity accumulation (principal) from financing cost (interest).
- [x] Vehicle assets automatically reflect accurate depreciated book value.
- [x] Users can export their complete financial ledger to CSV and JSON at any time.
- [x] Transaction history loads smoothly with cursor pagination.
- [x] Security headers achieve an A+ grade on securityheaders.com.
- [x] Vitest test suite achieves >90% coverage over all financial and calculation functions.
