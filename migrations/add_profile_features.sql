-- Migration: Add Profile Features
-- Description: Adds profile picture, home break, bio, and following system
-- Run this in your Supabase SQL editor

-- ============================================================================
-- 1. Add new fields to profiles table
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS home_break_label TEXT,
  ADD COLUMN IF NOT EXISTS home_break_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_break_lon DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Create follows table for following/followers system
-- ============================================================================

CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id) -- Can't follow yourself
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);

-- ============================================================================
-- 3. Storage Bucket Setup (Run in Supabase Dashboard -> Storage)
-- ============================================================================

-- In Supabase Dashboard:
-- 1. Go to Storage -> Create bucket
-- 2. Name: "profile-pictures"
-- 3. Public: Yes (so profile pictures are accessible)
-- 4. File size limit: 5MB (recommended)
-- 5. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp

-- ============================================================================
-- 4. Row Level Security (RLS) Policies for Storage
-- ============================================================================

-- Drop existing policies if they exist (allows re-running this migration)
DROP POLICY IF EXISTS "Profile pictures are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;

-- Corrected policy SQL (use these exact policies):
-- The path format is: {user_id}/profile-picture-{timestamp}.jpg

-- 1. SELECT (public read) - anyone can view profile pictures
CREATE POLICY "Profile pictures are publicly viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- 2. INSERT (upload own) - users can upload to their own folder
-- Using starts_with() to check if path starts with user_id/
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND starts_with(name, auth.uid()::text || '/')
);

-- 3. UPDATE (update own) - users can update their own files
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND starts_with(name, auth.uid()::text || '/')
)
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND starts_with(name, auth.uid()::text || '/')
);

-- 4. DELETE (delete own) - users can delete their own files
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' 
  AND starts_with(name, auth.uid()::text || '/')
);

-- ============================================================================
-- 5. Helper Views (Optional - for easier queries)
-- ============================================================================

-- View to get follower/following counts
CREATE OR REPLACE VIEW profile_stats AS
SELECT 
  p.id,
  p.username,
  COUNT(DISTINCT f1.follower_id) as follower_count,
  COUNT(DISTINCT f2.following_id) as following_count
FROM profiles p
LEFT JOIN follows f1 ON f1.following_id = p.id
LEFT JOIN follows f2 ON f2.follower_id = p.id
GROUP BY p.id, p.username;

-- ============================================================================
-- 6. Future: Conversations/Messages Tables (for later implementation)
-- ============================================================================

-- These are commented out for future use:

-- CREATE TABLE IF NOT EXISTS conversations (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS conversation_participants (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   UNIQUE(conversation_id, user_id)
-- );

-- CREATE TABLE IF NOT EXISTS messages (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
--   sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   content TEXT NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   read_at TIMESTAMP WITH TIME ZONE
-- );

-- CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
-- CREATE INDEX idx_messages_sender ON messages(sender_id);
