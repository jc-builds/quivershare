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

  const lengthFilter = url.searchParams.get('length')?.trim() || '';
  const volumeFilter = url.searchParams.get('volume')?.trim() || '';
  const finSystemFilter = url.searchParams.get('fin_system')?.trim() || '';
  const finSetupSlug = url.searchParams.get('fin_setup')?.trim() || '';
  const styleFilter = url.searchParams.get('style')?.trim() || '';

  const lengthRanges: Record<string, { min: number; max: number | null }> = {
    '66-72': { min: 66, max: 72 },
    '72-78': { min: 72, max: 78 },
    '78-84': { min: 78, max: 84 },
    '84-96': { min: 84, max: 96 },
    '96-108': { min: 96, max: 108 },
    '108-120': { min: 108, max: 120 },
    '120+': { min: 120, max: null }
  };

  const volumeRanges: Record<string, { min: number | null; max: number | null }> = {
    '<25': { min: null, max: 25 },
    '25-30': { min: 25, max: 30 },
    '30-35': { min: 30, max: 35 },
    '35-40': { min: 35, max: 40 },
    '40-45': { min: 40, max: 45 },
    '45-50': { min: 45, max: 50 },
    '50+': { min: 50, max: null }
  };

  const FIN_SETUP_MAP: Record<string, string> = {
    '2-plus-1': '2+1',
    '4-plus-1': '4+1',
    'twin': 'Twin',
    'quad': 'Quad',
    'tri': 'Tri',
    'single': 'Single',
    'tri-quad': 'Tri/Quad'
  };

  let boardsQuery = locals.supabase
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
    .or('state.is.null,state.eq.active');

  const lengthRange = lengthRanges[lengthFilter];
  if (lengthRange) {
    boardsQuery = boardsQuery.gte('length', lengthRange.min);
    if (lengthRange.max !== null) {
      boardsQuery = boardsQuery.lt('length', lengthRange.max);
    }
  }

  const volumeRange = volumeRanges[volumeFilter];
  if (volumeRange) {
    if (volumeRange.min !== null) {
      boardsQuery = boardsQuery.gte('volume', volumeRange.min);
    }
    if (volumeRange.max !== null) {
      boardsQuery = boardsQuery.lt('volume', volumeRange.max);
    }
  }

  if (finSystemFilter) {
    boardsQuery = boardsQuery.eq('fin_system', finSystemFilter);
  }

  const finSetupValue = FIN_SETUP_MAP[finSetupSlug];
  if (finSetupValue) {
    boardsQuery = boardsQuery.eq('fin_setup', finSetupValue);
  }

  if (styleFilter) {
    boardsQuery = boardsQuery.eq('style', styleFilter);
  }

  const {
    data: boards,
    error: boardsError,
    count
  } = await boardsQuery
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

