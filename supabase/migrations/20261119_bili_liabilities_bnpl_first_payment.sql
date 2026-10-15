-- Migration: Add first_payment_date to bili_liabilities for Buy Now, Pay Later (BNPL) support
ALTER TABLE public.bili_liabilities
  ADD COLUMN IF NOT EXISTS first_payment_date date DEFAULT NULL;
