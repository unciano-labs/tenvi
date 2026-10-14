-- Migration: 20261015_atomic_transaction_mutation.sql
-- Description: Implement atomic balance mutation RPCs with row-level locking for transactions and savings accounts.

CREATE OR REPLACE FUNCTION public.execute_atomic_transaction(
  p_website_id text,
  p_user_id uuid,
  p_kind text,
  p_amount numeric,
  p_occurred_on date,
  p_category_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_savings_id uuid DEFAULT NULL,
  p_credit_card_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id uuid;
  v_current_bal numeric;
  v_new_bal numeric;
BEGIN
  -- Strict multi-tenant caller verification
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: User identity mismatch';
  END IF;

  -- 1. If savings account is specified, lock the row and mutate balance atomically
  IF p_savings_id IS NOT NULL THEN
    SELECT current_balance INTO v_current_bal
    FROM public.bili_savings
    WHERE id = p_savings_id
      AND website_id = p_website_id
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Savings account not found or access denied';
    END IF;

    IF p_kind = 'income' THEN
      v_new_bal := v_current_bal + p_amount;
    ELSE
      v_new_bal := GREATEST(0, v_current_bal - p_amount);
    END IF;

    UPDATE public.bili_savings
    SET current_balance = v_new_bal,
        updated_at = NOW()
    WHERE id = p_savings_id;
  END IF;

  -- 2. Insert transaction record
  INSERT INTO public.bili_transactions (
    website_id,
    user_id,
    kind,
    amount,
    category_id,
    payment_method,
    credit_card_id,
    savings_id,
    property_id,
    occurred_on,
    note
  ) VALUES (
    p_website_id,
    p_user_id,
    p_kind,
    p_amount,
    p_category_id,
    p_payment_method,
    p_credit_card_id,
    p_savings_id,
    p_property_id,
    p_occurred_on,
    p_note
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'new_balance', v_new_bal
  );
END;
$$;

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
  v_current_bal numeric;
  v_reverted_bal numeric;
BEGIN
  -- Strict multi-tenant caller verification
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: User identity mismatch';
  END IF;

  -- 1. Fetch transaction details with row lock
  SELECT kind, amount, savings_id
  INTO v_kind, v_amount, v_savings_id
  FROM public.bili_transactions
  WHERE id = p_transaction_id
    AND website_id = p_website_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
  END IF;

  -- 2. If connected to savings account, revert balance atomically
  IF v_savings_id IS NOT NULL THEN
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

  -- 3. Delete the transaction record
  DELETE FROM public.bili_transactions
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_transaction_id,
    'reverted_balance', v_reverted_bal
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_atomic_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_delete_transaction TO authenticated;
