// src/routes/s/+page.server.ts
import type { PageServerLoad } from './$types';

type SortKey =
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'created_asc'
  | 'created_desc';

const SORT_COLUMNS: Record<
  SortKey,
  { column: 'price' | 'name' | 'created_at'; ascending: boolean }
> = {
  price_asc: { column: 'price', ascending: true },
  price_desc: { column: 'price', ascending: false },
  name_asc: { column: 'name', ascending: true },
  name_desc: { column: 'name', ascending: false },
  created_asc: { column: 'created_at', ascending: true },
  created_desc: { column: 'created_at', ascending: false }
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const userId = locals.user?.id ?? null;

  // Get user's location from profile if available
  let userLocation: string | null = null;
  let userLocationLat: number | null = null;
  let userLocationLon: number | null = null;
  
  if (userId) {
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('location_label, city, region, latitude, longitude')
      .eq('id', userId)
      .maybeSingle();
    
    if (profile) {
      userLocation = profile.location_label || 
        [profile.city, profile.region].filter(Boolean).join(', ') || 
        null;
      userLocationLat = profile.latitude;
      userLocationLon = profile.longitude;
    }
  }

  const sortParam = (url.searchParams.get('sort') ?? 'created_desc') as SortKey;
  const sortKey: SortKey =
    SORT_COLUMNS[sortParam] ? sortParam : 'created_desc';
  const sortConfig = SORT_COLUMNS[sortKey];

  const pageParam = Number(url.searchParams.get('page')) || 1;
  const limitParam = Number(url.searchParams.get('limit')) || 20;
  const page = pageParam > 0 ? pageParam : 1;
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const {
    data: boards,
    error: boardsError,
    count
  } = await locals.supabase
    .from('surfboards')
    .select(
      `
        id,
        name,
        make,
        length,
        width,
        thickness,
        volume,
        price,
        condition,
        fin_system,
        fin_setup,
        style,
        city,
        region,
        lat,
        lon,
        thumbnail_url,
        is_curated,
        user_id,
        created_at,
        last_modified
      `,
      { count: 'exact' }
    )
    .eq('is_deleted', false)
    .or('state.is.null,state.eq.active')
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(from, to);

  if (boardsError) {
    console.error('Error loading surfboards for /s route:', boardsError);
  }

  return {
    userId,
    userLocation,
    userLocationLat,
    userLocationLon,
    boards: boards ?? [],
    total: count ?? 0,
    page,
    limit,
    sort: sortKey
  };
};

