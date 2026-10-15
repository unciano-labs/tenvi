-- Allow 'credit_card_installment' in bili_liabilities liability_type
ALTER TABLE bili_liabilities DROP CONSTRAINT IF EXISTS bili_liabilities_liability_type_check;
ALTER TABLE bili_liabilities ADD CONSTRAINT bili_liabilities_liability_type_check
  CHECK (liability_type IN ('mortgage', 'auto_loan', 'personal_loan', 'student_loan', 'business_loan', 'credit_card_installment', 'other'));
