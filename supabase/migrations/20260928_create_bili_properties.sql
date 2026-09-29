-- Migration: Create bili_properties table and link property_id to bili_transactions
CREATE TABLE IF NOT EXISTS public.bili_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'vehicle',
  identifier text,
  estimated_value numeric NOT NULL DEFAULT 0,
  purchase_price numeric DEFAULT 0,
  purchase_date date,
  monthly_amortization numeric DEFAULT 0,
  amortization_due_day integer,
  annual_insurance_amount numeric DEFAULT 0,
  insurance_renewal_date date,
  expected_income_daily numeric DEFAULT 0,
  expected_income_monthly numeric DEFAULT 0,
  color_theme text DEFAULT 'indigo',
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bili_properties ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_properties' AND policyname = 'Users can manage their own properties'
  ) THEN
    CREATE POLICY "Users can manage their own properties"
      ON public.bili_properties
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.bili_transactions
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.bili_properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bili_transactions_property_id ON public.bili_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_bili_properties_user_id ON public.bili_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_bili_properties_website_id ON public.bili_properties(website_id);
