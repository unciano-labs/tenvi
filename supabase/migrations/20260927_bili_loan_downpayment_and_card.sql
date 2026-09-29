-- Migration: 20260927_bili_loan_downpayment_and_card
-- Description: Adds downpayment tracking and credit card linking to bili_loans,
-- and loan_id to bili_transactions for end-to-end traceability.

ALTER TABLE public.bili_loans
ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES public.bili_credit_cards(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS downpayment_amount numeric(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS downpayment_paid boolean DEFAULT false;

ALTER TABLE public.bili_transactions
ADD COLUMN IF NOT EXISTS loan_id uuid REFERENCES public.bili_loans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bili_loans_credit_card_id ON public.bili_loans(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_bili_transactions_loan_id ON public.bili_transactions(loan_id);
