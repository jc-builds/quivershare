/** Server-side image URL validation for surfboard listings */
import { error } from '@sveltejs/kit';

export const MAX_IMAGES_PER_LISTING = 6;
export const SUPABASE_PREFIX =
  'https://yeloehhzrtvjlehnjdqj.supabase.co/storage/v1/object/public/surfboard-images/';

/**
 * Validates image URLs from form data.
 * - Converts to string[], filters non-strings, trims, removes empty
 * - Enforces max 6 images
 * - Ensures all URLs are from our Supabase storage
 * - If thumbnailUrl is provided, it must be in the list
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
