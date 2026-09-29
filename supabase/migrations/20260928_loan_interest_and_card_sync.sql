-- Migration: 20260928_loan_interest_and_card_sync.sql
-- Description: Adds monthly interest rate and total interest to bili_loans,
-- and principal/interest breakdown columns to bili_loan_installments.

ALTER TABLE public.bili_loans
ADD COLUMN IF NOT EXISTS monthly_interest_rate numeric(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_interest numeric(12, 2) DEFAULT 0.00;

ALTER TABLE public.bili_loan_installments
ADD COLUMN IF NOT EXISTS principal_amount numeric(12, 2),
ADD COLUMN IF NOT EXISTS interest_amount numeric(12, 2),
ADD COLUMN IF NOT EXISTS statement_date date;
