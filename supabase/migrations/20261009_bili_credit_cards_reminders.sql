-- Add reminders_enabled column to bili_credit_cards (TNV-031)
ALTER TABLE bili_credit_cards 
ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT true;
