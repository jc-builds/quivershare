/**
 * Shared username validation rules.
 *
 * The database enforces case-insensitive uniqueness via a unique index on
 * lower(username). These constants keep client and server in sync.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

/** Matches the canonical rule: starts/ends with alphanumeric, interior allows . _ - */
export const USERNAME_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,22}[A-Za-z0-9])?$/;

/** Same pattern as a string for HTML `pattern` attributes. */
export const USERNAME_PATTERN = '^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,22}[A-Za-z0-9])?$';

export const USERNAME_HINT =
  '3\u201324 characters. Letters, numbers, periods, underscores, and hyphens. Must start and end with a letter or number.';

export const USERNAME_PLACEHOLDER = 'e.g. johnDoe_123!';

/** Auto-generated usernames start with `user_` (case-insensitive). */
export const isAutoUsername = (u: string | null | undefined): boolean =>
  !!u && u.toLowerCase().startsWith('user_');

export function validateUsername(value: string): string | null {
  if (value.length < USERNAME_MIN) {
    return `Username must be at least ${USERNAME_MIN} characters.`;
  }
  if (value.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MAX} characters or fewer.`;
  }
  if (!USERNAME_REGEX.test(value)) {
    return USERNAME_HINT;
  }
  return null;
}
