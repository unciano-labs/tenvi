-- Migration: Add Asset Valuations Schema (Task 3.2)
-- Enables historical book value tracking, appraisals, and depreciation records

create table if not exists public.bili_asset_valuations (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.bili_properties(id) on delete cascade,
  valuation_date date not null default current_date,
  valuation_amount numeric(14, 2) not null check (valuation_amount >= 0),
  valuation_source text not null default 'manual', -- 'manual', 'depreciation_engine', 'appraisal'
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_bili_asset_valuations_prop on public.bili_asset_valuations(property_id, valuation_date desc);
create index if not exists idx_bili_asset_valuations_user on public.bili_asset_valuations(website_id, user_id);

alter table public.bili_asset_valuations enable row level security;

create policy "Users can view their own asset valuations"
  on public.bili_asset_valuations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own asset valuations"
  on public.bili_asset_valuations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own asset valuations"
  on public.bili_asset_valuations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own asset valuations"
  on public.bili_asset_valuations for delete
  using (auth.uid() = user_id);
