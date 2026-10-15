-- Migration: 20261116_bili_support_tickets_and_in_app_notifications.sql
-- Description: Interactive Support Ticket Threads & In-App Notifications

-- 1. Add title column to bili_feedback if not exists
ALTER TABLE public.bili_feedback 
  ADD COLUMN IF NOT EXISTS title text;

-- 2. Update status constraint on bili_feedback to allow 'open' and 'closed'
ALTER TABLE public.bili_feedback 
  DROP CONSTRAINT IF EXISTS bili_feedback_status_check;

ALTER TABLE public.bili_feedback 
  ADD CONSTRAINT bili_feedback_status_check 
  CHECK (status IN ('new', 'open', 'in_progress', 'resolved', 'closed', 'wont_fix'));

-- 3. Create bili_feedback_messages table for two-way threaded conversations
CREATE TABLE IF NOT EXISTS public.bili_feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.bili_feedback(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'member')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_messages_ticket 
  ON public.bili_feedback_messages (ticket_id, created_at ASC);

ALTER TABLE public.bili_feedback_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Members can view messages of their own tickets
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_feedback_messages' AND policyname = 'Members can view messages of their own tickets') THEN
    CREATE POLICY "Members can view messages of their own tickets"
      ON public.bili_feedback_messages FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.bili_feedback f 
          WHERE f.id = ticket_id AND f.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy 2: Members can insert messages only on their own tickets
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_feedback_messages' AND policyname = 'Members can reply to their own tickets') THEN
    CREATE POLICY "Members can reply to their own tickets"
      ON public.bili_feedback_messages FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM public.bili_feedback f 
          WHERE f.id = ticket_id AND f.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy 3: Admins have full access to view and reply on all tickets
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_feedback_messages' AND policyname = 'Admins have full access to ticket messages') THEN
    CREATE POLICY "Admins have full access to ticket messages"
      ON public.bili_feedback_messages FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.bili_feedback f 
          WHERE f.id = ticket_id AND public.is_admin(f.website_id, auth.uid())
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.bili_feedback f 
          WHERE f.id = ticket_id AND public.is_admin(f.website_id, auth.uid())
        )
      );
  END IF;
END $$;

-- 4. Create bili_in_app_notifications table
CREATE TABLE IF NOT EXISTS public.bili_in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  type text NOT NULL DEFAULT 'ticket_update', -- 'ticket_new', 'ticket_reply', 'ticket_status', 'system'
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user 
  ON public.bili_in_app_notifications (website_id, user_id, is_read, created_at DESC);

ALTER TABLE public.bili_in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own notifications
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_in_app_notifications' AND policyname = 'Users can view their notifications') THEN
    CREATE POLICY "Users can view their notifications"
      ON public.bili_in_app_notifications FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy 2: Users can update is_read on their own notifications
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_in_app_notifications' AND policyname = 'Users can update their notifications') THEN
    CREATE POLICY "Users can update their notifications"
      ON public.bili_in_app_notifications FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy 3: Service role and authenticated users can insert notifications
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_in_app_notifications' AND policyname = 'Allow insert notifications') THEN
    CREATE POLICY "Allow insert notifications"
      ON public.bili_in_app_notifications FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;
