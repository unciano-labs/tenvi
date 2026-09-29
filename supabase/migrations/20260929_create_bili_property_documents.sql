-- Create bili_property_documents table
CREATE TABLE IF NOT EXISTS public.bili_property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL,
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.bili_properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  document_number text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  mime_type text DEFAULT 'application/pdf',
  issue_date date,
  expiry_date date,
  notify_before_days integer DEFAULT 30,
  notify_email boolean DEFAULT true,
  notify_sms boolean DEFAULT false,
  last_notified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bili_property_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_property_documents' AND policyname = 'Users can manage their own property documents'
  ) THEN
    CREATE POLICY "Users can manage their own property documents"
      ON public.bili_property_documents
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bili_property_docs_prop_id ON public.bili_property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_bili_property_docs_user_id ON public.bili_property_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_bili_property_docs_expiry ON public.bili_property_documents(expiry_date);

-- Add document_id column to bili_notification_logs if not exists
ALTER TABLE public.bili_notification_logs
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.bili_property_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bili_notification_logs_doc_id ON public.bili_notification_logs(document_id);

-- Create storage bucket for bili documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('bili-documents', 'bili-documents', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bili-documents
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload to bili-documents'
  ) THEN
    CREATE POLICY "Authenticated users can upload to bili-documents"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'bili-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can update in bili-documents'
  ) THEN
    CREATE POLICY "Authenticated users can update in bili-documents"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'bili-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can delete in bili-documents'
  ) THEN
    CREATE POLICY "Authenticated users can delete in bili-documents"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'bili-documents');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Anyone can view bili-documents'
  ) THEN
    CREATE POLICY "Anyone can view bili-documents"
      ON storage.objects FOR SELECT TO authenticated, anon
      USING (bucket_id = 'bili-documents');
  END IF;
END $$;
