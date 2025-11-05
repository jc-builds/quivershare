// GET /api/mapbox-token
// Returns the Mapbox token for client-side map initialization
import type { RequestHandler } from './$types';
import { MAPBOX_TOKEN } from '$env/static/private';

export const GET: RequestHandler = async () => {
  return new Response(JSON.stringify({ token: MAPBOX_TOKEN }), {
    headers: { 'content-type': 'application/json' }
  });
};

