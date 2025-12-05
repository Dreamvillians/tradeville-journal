-- Create storage bucket for goal and habit images
INSERT INTO storage.buckets (id, name, public)
VALUES ('goal-habit-images', 'goal-habit-images', true);

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload own goal/habit images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'goal-habit-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own images
CREATE POLICY "Users can view own goal/habit images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'goal-habit-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete own goal/habit images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'goal-habit-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to view images
CREATE POLICY "Public can view goal/habit images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'goal-habit-images');