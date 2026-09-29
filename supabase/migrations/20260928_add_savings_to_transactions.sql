-- Migration: Add savings_id to bili_transactions for traceable connected transactions
ALTER TABLE public.bili_transactions 
ADD COLUMN IF NOT EXISTS savings_id uuid REFERENCES public.bili_savings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bili_transactions_credit_card_id 
ON public.bili_transactions(credit_card_id) WHERE credit_card_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bili_transactions_savings_id 
ON public.bili_transactions(savings_id) WHERE savings_id IS NOT NULL;
