/** Client-side image upload validation for surfboard listings */
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGES_PER_LISTING = 6;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export type ValidationRejection = { file: string; reason: string };

export function validateImageFile(file: File): { valid: boolean; reason?: string } {
  const type = file.type?.toLowerCase() ?? '';
  if (!ALLOWED_MIME_TYPES.includes(type)) {
    return { valid: false, reason: 'Invalid file type. Use JPEG, PNG, or WebP.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, reason: `File too large (${mb}MB). Max 5MB.` };
  }
  return { valid: true };
}

/**
 * Validates selected files and returns accepted files plus rejection list.
 * Respects remaining slots (existingCount + newFiles must not exceed MAX_IMAGES_PER_LISTING).
 */
export function validateAndFilterImageFiles(
  selected: File[],
  existingCount: number
): { accepted: File[]; rejections: ValidationRejection[] } {
  const rejections: ValidationRejection[] = [];
  const accepted: File[] = [];
  const remainingSlots = Math.max(0, MAX_IMAGES_PER_LISTING - existingCount);

  for (const file of selected) {
    if (accepted.length >= remainingSlots) {
      rejections.push({ file: file.name, reason: 'Max 6 images per listing reached.' });
      continue;
    }

    const result = validateImageFile(file);
    if (result.valid) {
      accepted.push(file);
    } else {
      rejections.push({ file: file.name, reason: result.reason ?? 'Invalid file.' });
    }
  }

  return { accepted, rejections };
}
