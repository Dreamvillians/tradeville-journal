-- Fix strategies table RLS and constraints
-- First, drop the conflicting public policies
DROP POLICY IF EXISTS "Allow public insert to strategies" ON strategies;
DROP POLICY IF EXISTS "Allow public update to strategies" ON strategies;
DROP POLICY IF EXISTS "Allow public delete from strategies" ON strategies;
DROP POLICY IF EXISTS "Allow public read access to strategies" ON strategies;

-- Make user_id NOT NULL since RLS depends on it
ALTER TABLE strategies ALTER COLUMN user_id SET NOT NULL;

-- Ensure we have the correct user-specific policies
-- (These should already exist but we'll recreate them to be safe)
DROP POLICY IF EXISTS "Users can create own strategies" ON strategies;
DROP POLICY IF EXISTS "Users can view own strategies" ON strategies;
DROP POLICY IF EXISTS "Users can update own strategies" ON strategies;
DROP POLICY IF EXISTS "Users can delete own strategies" ON strategies;

CREATE POLICY "Users can create own strategies" 
ON strategies 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own strategies" 
ON strategies 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies" 
ON strategies 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies" 
ON strategies 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);