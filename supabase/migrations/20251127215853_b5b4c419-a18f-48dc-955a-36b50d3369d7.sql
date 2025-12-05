-- Add image_url column to strategies table for playbook thumbnails
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS image_url text;