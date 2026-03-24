/**
 * Shared server-side location parsing and validation.
 *
 * All location form submissions use the canonical hidden field names
 * emitted by LocationAutocomplete.svelte:
 *   location_label, location_city, location_region, location_country,
 *   location_lat, location_lon
 */

export interface ParsedLocation {
  label: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

function isFiniteInRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max;
}

/**
 * Attempt to parse a structured location from FormData.
 *
 * Returns a fully validated ParsedLocation if all required fields are
 * present and valid, or null if the submission represents "no location".
 *
 * Throws a LocationValidationError when the data is partially present
 * (some fields filled, others missing) which indicates a bad or stale
 * submission rather than a deliberate "clear".
 */
export function parseLocation(form: FormData): ParsedLocation | null {
  const label = form.get('location_label')?.toString()?.trim() ?? '';
  const city = form.get('location_city')?.toString()?.trim() ?? '';
  const region = form.get('location_region')?.toString()?.trim() ?? '';
  const country = form.get('location_country')?.toString()?.trim() ?? '';
  const latRaw = form.get('location_lat')?.toString()?.trim() ?? '';
  const lonRaw = form.get('location_lon')?.toString()?.trim() ?? '';

  const allEmpty = !label && !city && !region && !country && !latRaw && !lonRaw;
  if (allEmpty) return null;

  const lat = Number(latRaw);
  const lon = Number(lonRaw);

  const valid =
    label.length > 0 &&
    city.length > 0 &&
    region.length > 0 &&
    country.length > 0 &&
    isFiniteInRange(lat, -90, 90) &&
    isFiniteInRange(lon, -180, 180);

  if (!valid) {
    throw new LocationValidationError(
      'Location is incomplete — please select a location from the suggestions'
    );
  }

  return { label, city, region, country, lat, lon };
}

export class LocationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationValidationError';
  }
}

/**
 * Require a structured location. Returns the parsed location or throws.
 */
export function requireLocation(form: FormData): ParsedLocation {
  const loc = parseLocation(form);
  if (!loc) {
    throw new LocationValidationError(
      'Location is required — please select a location from the suggestions'
    );
  }
  return loc;
}

// ---------------------------------------------------------------------------
// Shop-specific address parsing (extends base location with address fields)
// ---------------------------------------------------------------------------

export interface ParsedShopAddress extends ParsedLocation {
  street_address: string | null;
  postal_code: string | null;
  full_address: string | null;
  mapbox_id: string | null;
}

export function parseShopAddress(form: FormData): ParsedShopAddress | null {
  const base = parseLocation(form);
  if (!base) return null;

  return {
    ...base,
    street_address: form.get('shop_street_address')?.toString()?.trim() || null,
    postal_code: form.get('shop_postal_code')?.toString()?.trim() || null,
    full_address: form.get('shop_full_address')?.toString()?.trim() || null,
    mapbox_id: form.get('shop_mapbox_id')?.toString()?.trim() || null
  };
}

export function requireShopAddress(form: FormData): ParsedShopAddress {
  const addr = parseShopAddress(form);
  if (!addr) {
    throw new LocationValidationError(
      'Address is required \u2014 please select an address from the suggestions'
    );
  }
  return addr;
}
