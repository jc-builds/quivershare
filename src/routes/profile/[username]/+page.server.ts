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
    .select('id, username, full_name, avatar_url, profile_picture_url, location_label, city, region, country, home_break_label, bio, created_at')
    .ilike('username', username)
    .maybeSingle();
  
  profile = result.data;
  profileError = result.error;
  
  // If error due to missing columns, try again with just base columns
  if (profileError && profileError.code === 'PGRST116') {
    const baseResult = await locals.supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, location_label, city, region, country, created_at')
      .ilike('username', username)
      .maybeSingle();
    
    profile = baseResult.data;
    profileError = baseResult.error;
    
    // Add null values for new columns that don't exist yet
    if (profile) {
      profile.profile_picture_url = null;
      profile.home_break_label = null;
      profile.bio = null;
    }
  }

  if (profileError || !profile) {
    throw error(404, 'Profile not found');
  }

  // Check if current user is viewing their own profile
  const currentUserId = locals.user?.id ?? null;
  const isOwnProfile = currentUserId === profile.id;

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

  // Check if current user is following this profile (gracefully handle if follows table doesn't exist)
  let isFollowing = false;
  let followerCount = 0;
  let followingCount = 0;

  try {
    if (currentUserId && !isOwnProfile) {
      const { data: followData, error: followError } = await locals.supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
        .maybeSingle();
      
      // Only set isFollowing if table exists (error code PGRST205 means table doesn't exist)
      if (!followError || followError.code !== 'PGRST205') {
        isFollowing = !!followData;
      }
    }

    // Get follower/following counts (gracefully handle if table doesn't exist)
    const { count: followerCountResult, error: followerError } = await locals.supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id);
    
    if (!followerError || followerError.code !== 'PGRST205') {
      followerCount = followerCountResult ?? 0;
    }

    const { count: followingCountResult, error: followingError } = await locals.supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id);

    if (!followingError || followingError.code !== 'PGRST205') {
      followingCount = followingCountResult ?? 0;
    }
  } catch (error) {
    // If follows table doesn't exist, counts remain 0 and isFollowing remains false
    console.warn('Follows table may not exist yet:', error);
  }

  return {
    profile,
    boards: boardsWithImage,
    isOwnProfile,
    currentUserId,
    isFollowing,
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0
  };
};
