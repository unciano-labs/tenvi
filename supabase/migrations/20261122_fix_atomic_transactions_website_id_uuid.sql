-- Migration: Fix website_id parameter type in execute_atomic_transaction and execute_atomic_delete_transaction
-- Reason: In PostgreSQL, p_website_id text cannot be inserted into public.bili_transactions.website_id (uuid)
-- without throwing: ERROR 42804: column "website_id" is of type uuid but expression is of type text.
-- This migration drops the old text-based functions and recreates them with p_website_id uuid.

-- 1. Drop existing functions with text signature
DROP FUNCTION IF EXISTS public.execute_atomic_transaction(text, uuid, text, numeric, date, uuid, text, uuid, uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.execute_atomic_delete_transaction(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.execute_atomic_delete_transaction(uuid, text, uuid);

-- 2. Create execute_atomic_transaction with p_website_id uuid
CREATE OR REPLACE FUNCTION public.execute_atomic_transaction(
  p_website_id uuid,
  p_user_id uuid,
  p_kind text,
  p_amount numeric,
  p_occurred_on date,
  p_category_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_savings_id uuid DEFAULT NULL,
  p_credit_card_id uuid DEFAULT NULL,
  p_property_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_transfer_to_savings_id uuid DEFAULT NULL
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
  v_dest_bal numeric;
  v_first_id uuid;
  v_second_id uuid;
BEGIN
  -- Strict multi-tenant caller verification
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: User identity mismatch';
  END IF;

  IF p_kind = 'transfer' THEN
    IF p_savings_id IS NULL OR p_transfer_to_savings_id IS NULL THEN
      RAISE EXCEPTION 'Transfer requires both source and destination accounts';
    END IF;

    IF p_savings_id = p_transfer_to_savings_id THEN
      RAISE EXCEPTION 'Source and destination accounts must be different';
    END IF;

    -- Deadlock-free row locking: lock accounts in alphabetical/UUID order
    IF p_savings_id < p_transfer_to_savings_id THEN
      v_first_id := p_savings_id;
      v_second_id := p_transfer_to_savings_id;
    ELSE
      v_first_id := p_transfer_to_savings_id;
      v_second_id := p_savings_id;
    END IF;

    PERFORM 1 FROM public.bili_savings
    WHERE id IN (v_first_id, v_second_id)
      AND website_id = p_website_id
      AND user_id = p_user_id
    FOR UPDATE;

    -- Debit source account
    SELECT current_balance INTO v_current_bal
    FROM public.bili_savings
    WHERE id = p_savings_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Source savings account not found';
    END IF;

    v_new_bal := GREATEST(0, v_current_bal - p_amount);
    UPDATE public.bili_savings
    SET current_balance = v_new_bal,
        updated_at = NOW()
    WHERE id = p_savings_id;

    -- Credit destination account
    SELECT current_balance INTO v_dest_bal
    FROM public.bili_savings
    WHERE id = p_transfer_to_savings_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Destination savings account not found';
    END IF;

    UPDATE public.bili_savings
    SET current_balance = v_dest_bal + p_amount,
        updated_at = NOW()
    WHERE id = p_transfer_to_savings_id;

  ELSIF p_savings_id IS NOT NULL THEN
    -- Standard single-account income/expense
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

  -- Insert transaction record
  INSERT INTO public.bili_transactions (
    website_id,
    user_id,
    kind,
    amount,
    category_id,
    payment_method,
    credit_card_id,
    savings_id,
    transfer_to_savings_id,
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
    p_transfer_to_savings_id,
    p_property_id,
    p_occurred_on,
    p_note
  ) RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'kind', p_kind,
    'amount', p_amount,
    'savings_id', p_savings_id,
    'transfer_to_savings_id', p_transfer_to_savings_id
  );
END;
$$;

-- 3. Create execute_atomic_delete_transaction with p_website_id uuid
CREATE OR REPLACE FUNCTION public.execute_atomic_delete_transaction(
  p_website_id uuid,
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

-- 4. Grant execution permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.execute_atomic_transaction(uuid, uuid, text, numeric, date, uuid, text, uuid, uuid, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_transaction(uuid, uuid, text, numeric, date, uuid, text, uuid, uuid, uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_atomic_delete_transaction(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_atomic_delete_transaction(uuid, uuid, uuid) TO service_role;

