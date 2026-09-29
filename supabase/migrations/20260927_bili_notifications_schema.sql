-- Migration: 20260927_bili_notifications_schema.sql
-- Description: Notification settings and notification logs for credit card upcoming bill alerts (Email & SMS)

create table if not exists public.bili_notification_settings (
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

-- RLS for settings
alter table public.bili_notification_settings enable row level security;

create policy "Users can view their notification settings"
  on public.bili_notification_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their notification settings"
  on public.bili_notification_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their notification settings"
  on public.bili_notification_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Notification logs / history table
create table if not exists public.bili_notification_logs (
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

-- RLS for logs
alter table public.bili_notification_logs enable row level security;

create policy "Users can view their notification logs"
  on public.bili_notification_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their notification logs"
  on public.bili_notification_logs for insert
  with check (auth.uid() = user_id);

-- Index to quickly look up if a notification was already sent on a given day
create index if not exists idx_bili_notification_logs_daily
  on public.bili_notification_logs(website_id, user_id, channel, sent_date);
