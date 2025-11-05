-- Migration: Enable Public Surfboard Reads
-- Description: Allows anyone (authenticated or not) to view surfboards
-- This is needed so users can see other users' boards on their profiles
-- Run this in your Supabase SQL editor

-- ============================================================================
-- 1. Check if RLS is enabled on surfboards table
-- ============================================================================

-- First, enable RLS if it's not already enabled
ALTER TABLE surfboards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Drop existing policies if they exist (allows re-running this migration)
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view surfboards" ON surfboards;
DROP POLICY IF EXISTS "Users can view their own surfboards" ON surfboards;
DROP POLICY IF EXISTS "Users can create their own surfboards" ON surfboards;
DROP POLICY IF EXISTS "Users can update their own surfboards" ON surfboards;
DROP POLICY IF EXISTS "Users can delete their own surfboards" ON surfboards;

-- ============================================================================
-- 3. Create RLS Policies
-- ============================================================================

-- SELECT: Anyone can view all surfboards (public read access)
-- This allows users to see other users' boards on profiles
CREATE POLICY "Anyone can view surfboards"
ON surfboards FOR SELECT
TO public
USING (true);

-- INSERT: Authenticated users can create their own surfboards
CREATE POLICY "Users can create their own surfboards"
ON surfboards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own surfboards
CREATE POLICY "Users can update their own surfboards"
ON surfboards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own surfboards
CREATE POLICY "Users can delete their own surfboards"
ON surfboards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Also ensure surfboard_images table has public read access
-- ============================================================================

-- Enable RLS on surfboard_images if not already enabled
ALTER TABLE surfboard_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view surfboard images" ON surfboard_images;
DROP POLICY IF EXISTS "Users can manage images for their own boards" ON surfboard_images;

-- SELECT: Anyone can view surfboard images
CREATE POLICY "Anyone can view surfboard images"
ON surfboard_images FOR SELECT
TO public
USING (true);

-- INSERT/UPDATE/DELETE: Users can manage images for boards they own
-- This policy checks if the user owns the board via the surfboard_id
CREATE POLICY "Users can manage images for their own boards"
ON surfboard_images FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surfboards
    WHERE surfboards.id = surfboard_images.surfboard_id
    AND surfboards.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surfboards
    WHERE surfboards.id = surfboard_images.surfboard_id
    AND surfboards.user_id = auth.uid()
  )
);

