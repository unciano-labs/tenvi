-- Migration: Create bili_liabilities table to track long-term debts (mortgages, auto loans, personal loans)
CREATE TABLE IF NOT EXISTS public.bili_liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  lender_name text NOT NULL,
  liability_type text NOT NULL DEFAULT 'mortgage' CHECK (liability_type IN ('mortgage', 'auto_loan', 'personal_loan', 'student_loan', 'business_loan', 'other')),
  original_principal numeric(14,2) NOT NULL DEFAULT 0 CHECK (original_principal >= 0),
  current_principal_balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (current_principal_balance >= 0),
  annual_interest_rate numeric(6,4) NOT NULL DEFAULT 0 CHECK (annual_interest_rate >= 0),
  term_months integer CHECK (term_months IS NULL OR term_months > 0),
  monthly_payment numeric(14,2) NOT NULL DEFAULT 0 CHECK (monthly_payment >= 0),
  due_day integer CHECK (due_day IS NULL OR (due_day >= 1 AND due_day <= 31)),
  start_date date,
  property_id uuid REFERENCES public.bili_properties(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'refinanced', 'defaulted')),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bili_liabilities ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_liabilities' AND policyname = 'Users can manage their own liabilities'
  ) THEN
    CREATE POLICY "Users can manage their own liabilities"
      ON public.bili_liabilities
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bili_liabilities_user_id ON public.bili_liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_bili_liabilities_website_id ON public.bili_liabilities(website_id);
CREATE INDEX IF NOT EXISTS idx_bili_liabilities_property_id ON public.bili_liabilities(property_id);
CREATE INDEX IF NOT EXISTS idx_bili_liabilities_status ON public.bili_liabilities(status);
