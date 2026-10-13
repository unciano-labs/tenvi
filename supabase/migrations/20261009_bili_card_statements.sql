-- TNV-011 & TNV-016: Credit Card Statements and Aggregated Spending Summaries
-- Single source of truth for statement billing and card utilization

-- 1. Card Statements Table
create table if not exists public.bili_card_statements (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.bili_credit_cards(id) on delete cascade,
  cycle_start date,
  cycle_end date not null,
  due_date date not null,
  billed_amount numeric(12, 2) not null check (billed_amount >= 0),
  minimum_due numeric(12, 2) not null default 0 check (minimum_due >= 0),
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  paid_on timestamptz,
  status text not null check (status in ('unpaid', 'partially_paid', 'paid', 'overdue')) default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_card_cycle_end unique (credit_card_id, cycle_end)
);

-- 2. Enforce Cross-User Card Isolation via Trigger
create or replace function public.validate_card_statement_owner()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.bili_credit_cards
    where id = new.credit_card_id
      and user_id = new.user_id
      and website_id = new.website_id
  ) then
    raise exception 'Unauthorized card statement: credit_card_id does not belong to the user.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_card_statement_owner on public.bili_card_statements;
create trigger trg_validate_card_statement_owner
  before insert or update on public.bili_card_statements
  for each row execute function public.validate_card_statement_owner();

-- 3. Performance Indexes
create index if not exists idx_bili_card_statements_scope
  on public.bili_card_statements(website_id, user_id, due_date);

create index if not exists idx_bili_card_statements_card
  on public.bili_card_statements(credit_card_id, cycle_end desc);

-- 4. Enable Row Level Security (RLS)
alter table public.bili_card_statements enable row level security;

drop policy if exists "bili_card_statements_user_isolation" on public.bili_card_statements;
create policy "bili_card_statements_user_isolation" on public.bili_card_statements
  for all using (
    website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id
  )
  with check (
    website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953' and auth.uid() = user_id
  );

-- 5. TNV-016: Aggregated spending RPC for per-card totals
create or replace function public.get_card_spending_summaries(
  p_website_id uuid,
  p_user_id uuid
)
returns table (
  card_id uuid,
  direct_spend numeric(12, 2),
  loans_spend numeric(12, 2),
  total_used numeric(12, 2),
  last_swipe_date date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with direct_tx as (
    select
      t.credit_card_id,
      coalesce(sum(t.amount), 0)::numeric(12, 2) as amount,
      max(t.occurred_on) as max_date
    from public.bili_transactions t
    where t.website_id = p_website_id
      and t.user_id = p_user_id
      and t.kind = 'expense'
      and t.credit_card_id is not null
    group by t.credit_card_id
  ),
  card_loans as (
    select
      l.credit_card_id,
      coalesce(sum(l.balance_remaining), 0)::numeric(12, 2) as amount,
      max(l.loaned_on) as max_date
    from public.bili_loans l
    where l.website_id = p_website_id
      and l.user_id = p_user_id
      and l.credit_card_id is not null
      and l.status != 'paid'
    group by l.credit_card_id
  )
  select
    c.id as card_id,
    coalesce(dt.amount, 0)::numeric(12, 2) as direct_spend,
    coalesce(cl.amount, 0)::numeric(12, 2) as loans_spend,
    (coalesce(dt.amount, 0) + coalesce(cl.amount, 0))::numeric(12, 2) as total_used,
    greatest(dt.max_date, cl.max_date) as last_swipe_date
  from public.bili_credit_cards c
  left join direct_tx dt on dt.credit_card_id = c.id
  left join card_loans cl on cl.credit_card_id = c.id
  where c.website_id = p_website_id
    and c.user_id = p_user_id
    and c.is_active = true;
end;
$$;

grant execute on function public.get_card_spending_summaries(uuid, uuid) to authenticated;
