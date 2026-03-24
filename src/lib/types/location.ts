export interface StructuredLocation {
  id: string;
  label: string;
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  street_address?: string;
  postal_code?: string;
  full_address?: string;
  mapbox_id?: string;
}
