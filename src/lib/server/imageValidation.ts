/** Server-side image URL validation for surfboard listings */
import { error } from '@sveltejs/kit';

export const MAX_IMAGES_PER_LISTING = 6;

// Must be set per environment (local / staging / prod)
const SUPABASE_PREFIX = process.env.PUBLIC_SUPABASE_IMAGE_PREFIX;

if (!SUPABASE_PREFIX) {
  throw new Error(
    'PUBLIC_SUPABASE_IMAGE_PREFIX is not defined. ' +
    'Set it to your Supabase public surfboard-images bucket URL.'
  );
}

/**
 * Validates image URLs from form data.
 * - Converts to string[], trims, removes empty
 * - Enforces max 6 images
 * - Ensures all URLs belong to the configured Supabase bucket
 * - If thumbnailUrl is provided, it must be one of the uploaded images
 */
export function validateImageUrls(
  rawUrls: unknown[],
  thumbnailUrl?: string | null
): string[] {
  const cleanedUrls = rawUrls
    .filter((u): u is string => typeof u === 'string')
    .map((u) => u.trim())
    .filter((u) => u !== '');

  if (cleanedUrls.length > MAX_IMAGES_PER_LISTING) {
    throw error(400, 'Maximum 6 images allowed.');
  }

  for (const url of cleanedUrls) {
    if (!url.startsWith(SUPABASE_PREFIX)) {
      throw error(400, 'Invalid image URL detected.');
    }
  }

  if (thumbnailUrl != null && thumbnailUrl !== '') {
    const trimmed = thumbnailUrl.trim();
    if (trimmed && !cleanedUrls.includes(trimmed)) {
      throw error(400, 'Thumbnail must be one of the uploaded images.');
    }
  }

  return cleanedUrls;
}