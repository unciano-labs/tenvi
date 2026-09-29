-- Bili Savings & Accounts Schema Migration
-- Website ID: 65d4f86e-1829-417a-981f-bc7aad7bc953

create table if not exists public.bili_savings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  account_type text not null check (account_type in ('digital_bank', 'traditional_bank', 'cash', 'ewallet')),
  institution_name text not null,
  account_number_last4 text,
  current_balance numeric(12, 2) not null default 0,
  target_amount numeric(12, 2),
  interest_rate numeric(5, 2),
  color_theme text not null default 'emerald',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bili_savings_scope on public.bili_savings(website_id, user_id);

alter table public.bili_savings enable row level security;

drop policy if exists "bili_savings_user_isolation" on public.bili_savings;

create policy "bili_savings_user_isolation" on public.bili_savings
  for all using (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id)
  with check (website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id);
