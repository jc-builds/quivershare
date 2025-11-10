-- Migration: Add Search Fields to Surfboards
-- Description: Adds fields needed for the /s/ search functionality
-- Run this in your Supabase SQL editor

-- Add missing columns to surfboards table
ALTER TABLE surfboards
  ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS fin_system TEXT,
  ADD COLUMN IF NOT EXISTS fin_setup TEXT,
  ADD COLUMN IF NOT EXISTS style TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;

-- Optional: Add comments to document the fields
COMMENT ON COLUMN surfboards.price IS 'Price in USD (e.g., 850.00)';
COMMENT ON COLUMN surfboards.fin_system IS 'Fin box type: FCS II, Futures, Glass On, or FCS';
COMMENT ON COLUMN surfboards.fin_setup IS 'Fin configuration: 2+1, 4+1, Quad, Single, Tri, or Tri/Quad';
COMMENT ON COLUMN surfboards.style IS 'Board style: Shortboard, Longboard, Groveler, or Gun';
COMMENT ON COLUMN surfboards.city IS 'City where board is located';
COMMENT ON COLUMN surfboards.region IS 'State/region where board is located';
COMMENT ON COLUMN surfboards.lat IS 'Latitude for distance calculations';
COMMENT ON COLUMN surfboards.lon IS 'Longitude for distance calculations';

