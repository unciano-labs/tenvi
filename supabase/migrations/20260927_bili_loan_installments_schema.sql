-- Bili Installment Loans Migration
-- Website ID: 65d4f86e-1829-417a-981f-bc7aad7bc953

alter table public.bili_loans
  add column if not exists is_installment boolean not null default false,
  add column if not exists installment_months integer check (installment_months in (3, 6, 12, 24, 36, 48, 60)),
  add column if not exists monthly_due_day integer check (monthly_due_day between 1 and 31),
  add column if not exists monthly_amount numeric(12, 2);

create table if not exists public.bili_loan_installments (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.bili_loans(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  is_paid boolean not null default false,
  paid_on date,
  payment_method text default 'cash',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bili_loan_installments_scope on public.bili_loan_installments(website_id, user_id, loan_id);

alter table public.bili_loan_installments enable row level security;

drop policy if exists "bili_loan_installments_user_isolation" on public.bili_loan_installments;

create policy "bili_loan_installments_user_isolation" on public.bili_loan_installments
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);
