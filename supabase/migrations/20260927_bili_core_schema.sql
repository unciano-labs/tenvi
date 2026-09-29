-- Bili Core Schema Migration
-- Website ID: 65d4f86e-1829-417a-981f-bc7aad7bc953
-- Website Role (user): 02bf8818-b503-4f94-beac-6c45aa12e368

-- 1. Contacts (People you lend money to or split bills with)
create table if not exists public.bili_contacts (
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
create table if not exists public.bili_categories (
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
create table if not exists public.bili_credit_cards (
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
create table if not exists public.bili_transactions (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.bili_categories(id) on delete set null,
  payment_method text not null check (payment_method in ('cash', 'credit_card', 'debit_card', 'gcash', 'maya', 'bank_transfer')),
  credit_card_id uuid references public.bili_credit_cards(id) on delete set null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Personal Loans (Money Lent to Others)
create table if not exists public.bili_loans (
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Loan Repayments (Partial or full payments against a loan)
create table if not exists public.bili_loan_payments (
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
create table if not exists public.bili_bill_splits (
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
create table if not exists public.bili_split_participants (
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

-- Indexes for performance
create index if not exists idx_bili_contacts_scope on public.bili_contacts(website_id, user_id);
create index if not exists idx_bili_categories_scope on public.bili_categories(website_id, user_id);
create index if not exists idx_bili_credit_cards_scope on public.bili_credit_cards(website_id, user_id);
create index if not exists idx_bili_transactions_scope on public.bili_transactions(website_id, user_id, occurred_on desc);
create index if not exists idx_bili_loans_scope on public.bili_loans(website_id, user_id, status);
create index if not exists idx_bili_loan_payments_scope on public.bili_loan_payments(website_id, user_id, loan_id);
create index if not exists idx_bili_bill_splits_scope on public.bili_bill_splits(website_id, user_id, occurred_on desc);
create index if not exists idx_bili_split_participants_scope on public.bili_split_participants(website_id, user_id, split_id);

-- Enable RLS
alter table public.bili_contacts enable row level security;
alter table public.bili_categories enable row level security;
alter table public.bili_credit_cards enable row level security;
alter table public.bili_transactions enable row level security;
alter table public.bili_loans enable row level security;
alter table public.bili_loan_payments enable row level security;
alter table public.bili_bill_splits enable row level security;
alter table public.bili_split_participants enable row level security;

-- Drop existing policies if any
drop policy if exists "bili_contacts_user_isolation" on public.bili_contacts;
drop policy if exists "bili_categories_user_isolation" on public.bili_categories;
drop policy if exists "bili_credit_cards_user_isolation" on public.bili_credit_cards;
drop policy if exists "bili_transactions_user_isolation" on public.bili_transactions;
drop policy if exists "bili_loans_user_isolation" on public.bili_loans;
drop policy if exists "bili_loan_payments_user_isolation" on public.bili_loan_payments;
drop policy if exists "bili_bill_splits_user_isolation" on public.bili_bill_splits;
drop policy if exists "bili_split_participants_user_isolation" on public.bili_split_participants;

-- Scoped RLS Policies
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
