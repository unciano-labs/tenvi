-- Migration: Add paid_installment_numbers to bili_liabilities to track paid installment terms
ALTER TABLE public.bili_liabilities
ADD COLUMN IF NOT EXISTS paid_installment_numbers integer[] DEFAULT '{}'::integer[];
