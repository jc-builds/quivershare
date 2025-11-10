// src/routes/profile/[username]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const username = params.username?.toLowerCase();

  if (!username) {
    throw error(404, 'Profile not found');
  }

  // Fetch profile by username
  // Try to include new fields - if they don't exist yet, Supabase will error, which we handle
  let profile: any = null;
  let profileError: any = null;
  
  // First try with all fields
  const result = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url, location_label, city, region, country, home_break_label, bio, created_at')
    .ilike('username', username)
    .maybeSingle();
  
  profile = result.data;
  profileError = result.error;
  
  // If error due to missing columns, try again with just base columns
  if (profileError && profileError.code === 'PGRST116') {
    const baseResult = await locals.supabase
      .from('profiles')
      .select('id, username, full_name, profile_picture_url, location_label, city, region, country, created_at')
      .ilike('username', username)
      .maybeSingle();
    
    profile = baseResult.data;
    profileError = baseResult.error;
    
    // Add null values for new columns that don't exist yet
    if (profile) {
      profile.home_break_label = null;
      profile.bio = null;
    }
  }

  if (profileError || !profile) {
    throw error(404, 'Profile not found');
  }

  // Check if current user is viewing their own profile
  const isOwnProfile = (locals.user?.id ?? null) === profile.id;

  // Fetch this user's surfboards
  const { data: boards, error: boardsError } = await locals.supabase
    .from('surfboards')
    .select(`
      id,
      name,
      thumbnail_url,
      length,
      width,
      thickness,
      condition,
      surfboard_images(image_url)
    `)
    .eq('user_id', profile.id)
    .order('last_modified', { ascending: false });

  if (boardsError) {
    console.error('Error loading boards for profile:', profile.id, boardsError);
  }

  // Attach a single fallback image per board
  const boardsWithImage = (boards ?? []).map((board: any) => ({
    ...board,
    image_url: board.surfboard_images?.[0]?.image_url || null
  }));

  return {
    profile,
    boards: boardsWithImage,
    isOwnProfile
  };
};
