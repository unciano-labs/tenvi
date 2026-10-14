-- Migration: Soft Deletes and Immutable Audit Logs for Tenvi Financial Records

-- 1. Add deleted_at columns
ALTER TABLE public.bili_transactions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.bili_savings
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.bili_loans
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.bili_properties
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.bili_credit_cards
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Partial indexes for fast active-record queries
CREATE INDEX IF NOT EXISTS idx_bili_transactions_active
  ON public.bili_transactions(website_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bili_savings_active
  ON public.bili_savings(website_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bili_loans_active
  ON public.bili_loans(website_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bili_properties_active
  ON public.bili_properties(website_id, user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bili_credit_cards_active
  ON public.bili_credit_cards(website_id, user_id)
  WHERE deleted_at IS NULL;

-- 3. Create immutable audit log table
CREATE TABLE IF NOT EXISTS public.bili_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id text NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'SOFT_DELETE', 'HARD_DELETE', 'RESTORE'
  entity_type text NOT NULL, -- 'transaction', 'savings', 'loan', 'property', 'liability', 'credit_card'
  entity_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bili_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_audit_logs' AND policyname = 'Users can view their own audit logs'
  ) THEN
    CREATE POLICY "Users can view their own audit logs"
      ON public.bili_audit_logs
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_audit_logs' AND policyname = 'Users can append to their audit logs'
  ) THEN
    CREATE POLICY "Users can append to their audit logs"
      ON public.bili_audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bili_audit_logs_user_id ON public.bili_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bili_audit_logs_entity ON public.bili_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bili_audit_logs_created_at ON public.bili_audit_logs(created_at DESC);

-- 4. Update execute_atomic_delete_transaction to perform soft deletion
CREATE OR REPLACE FUNCTION public.execute_atomic_delete_transaction(
  p_website_id text,
  p_user_id uuid,
  p_transaction_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_amount numeric;
  v_savings_id uuid;
  v_transfer_to_savings_id uuid;
  v_current_bal numeric;
  v_reverted_bal numeric;
  v_dest_bal numeric;
  v_dest_reverted numeric;
BEGIN
  -- Multi-tenant caller verification
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: User identity mismatch';
  END IF;

  -- 1. Fetch transaction details with row lock (ensure not already soft-deleted)
  SELECT kind, amount, savings_id, transfer_to_savings_id
  INTO v_kind, v_amount, v_savings_id, v_transfer_to_savings_id
  FROM public.bili_transactions
  WHERE id = p_transaction_id
    AND website_id = p_website_id
    AND user_id = p_user_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or already deleted';
  END IF;

  -- 2. Balance reversion
  IF v_kind = 'transfer' THEN
    -- Revert source account (add back transferred amount)
    IF v_savings_id IS NOT NULL THEN
      SELECT current_balance INTO v_current_bal
      FROM public.bili_savings
      WHERE id = v_savings_id
        AND website_id = p_website_id
        AND user_id = p_user_id
      FOR UPDATE;

      IF FOUND THEN
        UPDATE public.bili_savings
        SET current_balance = v_current_bal + v_amount,
            updated_at = NOW()
        WHERE id = v_savings_id;
      END IF;
    END IF;

    -- Revert destination account (subtract credited amount)
    IF v_transfer_to_savings_id IS NOT NULL THEN
      SELECT current_balance INTO v_dest_bal
      FROM public.bili_savings
      WHERE id = v_transfer_to_savings_id
        AND website_id = p_website_id
        AND user_id = p_user_id
      FOR UPDATE;

      IF FOUND THEN
        UPDATE public.bili_savings
        SET current_balance = GREATEST(0, v_dest_bal - v_amount),
            updated_at = NOW()
        WHERE id = v_transfer_to_savings_id;
      END IF;
    END IF;

  ELSIF v_savings_id IS NOT NULL THEN
    SELECT current_balance INTO v_current_bal
    FROM public.bili_savings
    WHERE id = v_savings_id
      AND website_id = p_website_id
      AND user_id = p_user_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_kind = 'income' THEN
        v_reverted_bal := GREATEST(0, v_current_bal - v_amount);
      ELSE
        v_reverted_bal := v_current_bal + v_amount;
      END IF;

      UPDATE public.bili_savings
      SET current_balance = v_reverted_bal,
          updated_at = NOW()
      WHERE id = v_savings_id;
    END IF;
  END IF;

  -- 3. Soft-delete the transaction record
  UPDATE public.bili_transactions
  SET deleted_at = NOW()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_transaction_id,
    'soft_deleted', true,
    'reverted_balance', v_reverted_bal
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_atomic_delete_transaction TO authenticated;
