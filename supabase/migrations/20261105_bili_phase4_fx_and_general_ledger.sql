-- ============================================================================
-- Phase 4: Commercial FinTech Scale Migration
-- Tasks:
-- 4.1 Multi-Currency & Automated FX Engine (bili_exchange_rates & currency columns)
-- 4.2 Double-Entry General Ledger (bili_accounts, bili_journal_entries, bili_journal_lines)
-- 4.3 Open Banking & Financial Aggregators (bili_institution_connections)
-- 4.4 Capital Gains & Tax Records (bili_tax_records)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Multi-Currency Support: Add currency columns across financial entities
-- ----------------------------------------------------------------------------
alter table public.bili_savings
  add column if not exists currency text not null default 'PHP';

alter table public.bili_transactions
  add column if not exists currency text not null default 'PHP';

alter table public.bili_credit_cards
  add column if not exists currency text not null default 'PHP';

alter table public.bili_properties
  add column if not exists currency text not null default 'PHP';

alter table public.bili_liabilities
  add column if not exists currency text not null default 'PHP';

alter table public.bili_loans
  add column if not exists currency text not null default 'PHP';

-- ----------------------------------------------------------------------------
-- 2. FX Exchange Rates Table
-- ----------------------------------------------------------------------------
create table if not exists public.bili_exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null default 'PHP',
  target_currency text not null,
  rate numeric(18, 8) not null check (rate > 0),
  source text not null default 'open_er_api',
  as_of_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint uq_bili_exchange_rate unique (base_currency, target_currency, as_of_date)
);

create index if not exists idx_exchange_rates_lookup
  on public.bili_exchange_rates(base_currency, target_currency, as_of_date desc);

-- Pre-seed standard baseline FX exchange rates (Base: PHP)
insert into public.bili_exchange_rates (base_currency, target_currency, rate, source, as_of_date)
values
  ('PHP', 'USD', 0.01754, 'baseline_ecb', current_date),
  ('PHP', 'EUR', 0.01612, 'baseline_ecb', current_date),
  ('PHP', 'SGD', 0.02325, 'baseline_ecb', current_date),
  ('PHP', 'JPY', 2.68450, 'baseline_ecb', current_date),
  ('PHP', 'GBP', 0.01375, 'baseline_ecb', current_date),
  ('PHP', 'AUD', 0.02670, 'baseline_ecb', current_date),
  ('PHP', 'CAD', 0.02410, 'baseline_ecb', current_date),
  ('PHP', 'HKD', 0.13680, 'baseline_ecb', current_date)
on conflict (base_currency, target_currency, as_of_date) do update
  set rate = excluded.rate, created_at = now();

-- ----------------------------------------------------------------------------
-- 3. Double-Entry General Ledger System
-- ----------------------------------------------------------------------------
create table if not exists public.bili_accounts (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_code text,
  name text not null,
  classification text not null check (classification in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  sub_classification text,
  currency text not null default 'PHP',
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bili_accounts_user
  on public.bili_accounts(website_id, user_id, classification);

create table if not exists public.bili_journal_entries (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  description text not null,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_bili_journal_entries_date
  on public.bili_journal_entries(user_id, entry_date desc);

create table if not exists public.bili_journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.bili_journal_entries(id) on delete cascade,
  account_id uuid not null references public.bili_accounts(id) on delete restrict,
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  memo text,
  constraint chk_journal_line_debit_xor_credit check (
    (debit > 0 and credit = 0) or (credit > 0 and debit = 0)
  )
);

create index if not exists idx_bili_journal_lines_account
  on public.bili_journal_lines(account_id);

-- Atomic RPC: Post a balanced double-entry journal entry
create or replace function public.post_balanced_journal_entry(
  p_website_id uuid,
  p_user_id uuid,
  p_description text,
  p_entry_date date,
  p_lines jsonb,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_line jsonb;
  v_debit_sum numeric := 0;
  v_credit_sum numeric := 0;
  v_debit numeric;
  v_credit numeric;
  v_account_id uuid;
begin
  if auth.uid() != p_user_id then
    raise exception 'Unauthorized operation: user_id mismatch';
  end if;

  -- 1. Validate total debit equals total credit
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_debit := coalesce((v_line->>'debit')::numeric, 0);
    v_credit := coalesce((v_line->>'credit')::numeric, 0);
    v_debit_sum := v_debit_sum + v_debit;
    v_credit_sum := v_credit_sum + v_credit;
  end loop;

  if v_debit_sum != v_credit_sum or v_debit_sum <= 0 then
    raise exception 'Unbalanced journal entry: Total Debits (%) must equal Total Credits (%) and be > 0',
      v_debit_sum, v_credit_sum;
  end if;

  -- 2. Insert Journal Header
  insert into public.bili_journal_entries (
    website_id, user_id, entry_date, description, reference_type, reference_id
  ) values (
    p_website_id, p_user_id, p_entry_date, p_description, p_reference_type, p_reference_id
  ) returning id into v_entry_id;

  -- 3. Insert Journal Lines
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_account_id := (v_line->>'account_id')::uuid;
    v_debit := coalesce((v_line->>'debit')::numeric, 0);
    v_credit := coalesce((v_line->>'credit')::numeric, 0);

    insert into public.bili_journal_lines (
      entry_id, account_id, debit, credit, memo
    ) values (
      v_entry_id, v_account_id, v_debit, v_credit, v_line->>'memo'
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'entry_id', v_entry_id,
    'balanced_amount', v_debit_sum
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Open Banking / Financial Aggregator Connections (Plaid / Brankas / Finverse)
-- ----------------------------------------------------------------------------
create table if not exists public.bili_institution_connections (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('brankas', 'plaid', 'finverse', 'manual_import')),
  institution_id text not null,
  institution_name text not null,
  connection_status text not null default 'connected' check (connection_status in ('connected', 'disconnected', 'expired', 'error')),
  encrypted_access_token text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  sync_error text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bili_institution_user
  on public.bili_institution_connections(website_id, user_id, connection_status);

-- ----------------------------------------------------------------------------
-- 5. Capital Gains & Automated Tax Records (Schedule 1706 / Tax Deductions)
-- ----------------------------------------------------------------------------
create table if not exists public.bili_tax_records (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  category text not null check (category in ('capital_gains', 'business_rental', 'deductible_interest', 'annual_depreciation')),
  gross_amount numeric(14, 2) not null,
  deductible_amount numeric(14, 2) not null default 0,
  taxable_amount numeric(14, 2) not null,
  tax_due numeric(14, 2) not null default 0,
  property_id uuid references public.bili_properties(id) on delete set null,
  liability_id uuid references public.bili_liabilities(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bili_tax_user_year
  on public.bili_tax_records(website_id, user_id, tax_year);

-- ----------------------------------------------------------------------------
-- 6. Row Level Security Policies
-- ----------------------------------------------------------------------------
alter table public.bili_accounts enable row level security;
alter table public.bili_journal_entries enable row level security;
alter table public.bili_journal_lines enable row level security;
alter table public.bili_institution_connections enable row level security;
alter table public.bili_tax_records enable row level security;

create policy "bili_accounts_isolation" on public.bili_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bili_journal_entries_isolation" on public.bili_journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bili_journal_lines_isolation" on public.bili_journal_lines
  for all using (exists (
    select 1 from public.bili_journal_entries e
    where e.id = bili_journal_lines.entry_id and e.user_id = auth.uid()
  ));

create policy "bili_institution_connections_isolation" on public.bili_institution_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bili_tax_records_isolation" on public.bili_tax_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
