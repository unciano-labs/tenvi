-- Migration: 20261102_allow_open_ended_loans_optional_duration.sql
-- Description: Drop restricted list check on installment_months in bili_loans so duration is truly optional
-- and supports open-ended loans (NULL) or custom terms (> 0).

ALTER TABLE public.bili_loans
  DROP CONSTRAINT IF EXISTS bili_loans_installment_months_check;

ALTER TABLE public.bili_loans
  ADD CONSTRAINT bili_loans_installment_months_check
  CHECK (installment_months IS NULL OR installment_months > 0);
