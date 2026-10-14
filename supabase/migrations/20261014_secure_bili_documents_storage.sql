-- Migration: 20261014_secure_bili_documents_storage.sql
-- Description: Restrict bili-documents bucket to private and enforce tenant path isolation for sensitive documents

-- 1. Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'bili-documents';

-- 2. Drop the overly permissive public view policy
DROP POLICY IF EXISTS "Anyone can view bili-documents" ON storage.objects;

-- 3. Replace with user-isolated select policy (storage path: {userId}/{propertyId}/{filename})
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can view their own bili-documents'
  ) THEN
    CREATE POLICY "Users can view their own bili-documents"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'bili-documents' 
        AND (auth.uid())::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
