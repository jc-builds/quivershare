-- Migration: Add fin_setup column, migrate from fins, and drop fins
-- Description: Replaces legacy 'fins' field with standardized 'fin_setup'

-- Add the fin_setup column
ALTER TABLE surfboards
  ADD COLUMN IF NOT EXISTS fin_setup TEXT;

-- Migrate existing fins data to fin_setup
-- Map legacy values to new standardized values
UPDATE surfboards
SET fin_setup = CASE
  WHEN fins = 'Single' THEN 'Single'
  WHEN fins = 'Quad' THEN 'Quad'
  WHEN fins = 'Thruster' THEN 'Tri'  -- Thruster is a tri-fin setup
  WHEN fins = 'Twin' THEN NULL  -- No direct match, leave null
  WHEN fins = 'Bonzer' THEN NULL  -- No direct match, leave null
  ELSE fins  -- Keep other values as-is if they match
END
WHERE fin_setup IS NULL AND fins IS NOT NULL;

-- Drop the legacy fins column
ALTER TABLE surfboards
  DROP COLUMN IF EXISTS fins;

