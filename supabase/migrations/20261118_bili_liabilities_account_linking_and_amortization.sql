-- Migration: 20261118_bili_liabilities_account_linking_and_amortization.sql
-- Description: Add account linking (credit card, savings), interest rate type (monthly add-on vs annual),
-- and manual amortization override tracking to bili_liabilities.

ALTER TABLE public.bili_liabilities
  ADD COLUMN IF NOT EXISTS linked_account_type text CHECK (linked_account_type IN ('credit_card', 'savings') OR linked_account_type IS NULL),
  ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES public.bili_credit_cards(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS savings_id uuid REFERENCES public.bili_savings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interest_rate_type text NOT NULL DEFAULT 'annual' CHECK (interest_rate_type IN ('annual', 'monthly_addon')),
  ADD COLUMN IF NOT EXISTS interest_rate numeric(8,4) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  ADD COLUMN IF NOT EXISTS is_amortization_overridden boolean NOT NULL DEFAULT false;

-- Add indexes for fast lookup and relational integrity
CREATE INDEX IF NOT EXISTS idx_bili_liabilities_credit_card_id ON public.bili_liabilities(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_bili_liabilities_savings_id ON public.bili_liabilities(savings_id);

-- Backfill existing liabilities to align interest_rate with annual_interest_rate
UPDATE public.bili_liabilities
SET 
  interest_rate = annual_interest_rate,
  interest_rate_type = 'annual'
WHERE interest_rate = 0 AND annual_interest_rate > 0;
