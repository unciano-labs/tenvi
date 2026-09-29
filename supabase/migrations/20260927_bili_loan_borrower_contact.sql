-- Migration: 20260927_bili_loan_borrower_contact.sql
-- Description: Add borrower phone, email, and notification preference to bili_loans

ALTER TABLE public.bili_loans
ADD COLUMN IF NOT EXISTS borrower_phone text,
ADD COLUMN IF NOT EXISTS borrower_email text,
ADD COLUMN IF NOT EXISTS notify_borrower boolean not null default true;

-- Update notification logs to support loan reminders
ALTER TABLE public.bili_notification_logs
ALTER COLUMN card_names DROP NOT NULL;

ALTER TABLE public.bili_notification_logs
ADD COLUMN IF NOT EXISTS loan_id uuid references public.bili_loans(id) on delete set null;

