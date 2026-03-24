// Minimal proxy to Mapbox Places. Keeps your token off the client.
// GET /api/places?q=brooklyn
// GET /api/places?q=123+main+st&mode=address  (address-level results for shops)
import type { RequestHandler } from './$types';
import { MAPBOX_TOKEN } from '$env/static/private';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const q = url.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return new Response(JSON.stringify({ features: [] }), { headers: { 'content-type': 'application/json' } });
  }

  const isAddressMode = url.searchParams.get('mode') === 'address';

  const mapboxUrl = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  mapboxUrl.searchParams.set('access_token', MAPBOX_TOKEN);
  mapboxUrl.searchParams.set('autocomplete', 'true');
  mapboxUrl.searchParams.set('types', isAddressMode ? 'address,poi' : 'place,locality,neighborhood,region');
  mapboxUrl.searchParams.set('limit', '5');

  const res = await fetch(mapboxUrl, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    return new Response(JSON.stringify({ features: [] }), { headers: { 'content-type': 'application/json' }, status: 200 });
  }

  const data = await res.json();

  const features = (data.features ?? []).map((f: any) => {
    const [lon, lat] = f.center ?? [null, null];
    const ctx = (f.context ?? []).reduce((acc: Record<string, string>, c: any) => {
      if (c.id?.startsWith('country')) acc.country = c.text;
      if (c.id?.startsWith('region')) acc.region = c.text;
      if (c.id?.startsWith('place')) acc.city = c.text;
      if (c.id?.startsWith('postcode')) acc.postcode = c.text;
      return acc;
    }, {} as Record<string, string>);

    const city = f.place_type?.includes('place') ? f.text : (ctx.city ?? '');

    const base: Record<string, any> = {
      id: f.id as string,
      label: f.place_name as string,
      lat,
      lon,
      city,
      region: ctx.region ?? '',
      country: ctx.country ?? ''
    };

    if (isAddressMode) {
      const isPoi = f.place_type?.includes('poi');
      base.street_address = isPoi
        ? (f.properties?.address ?? '')
        : ((f.address ? `${f.address} ${f.text}` : f.text) ?? '').trim();
      base.postal_code = ctx.postcode ?? '';
      base.full_address = f.place_name as string;
      base.mapbox_id = f.id as string;
    }

    return base;
  });

  return new Response(JSON.stringify({ features }), {
    headers: { 'content-type': 'application/json' }
  });
};
