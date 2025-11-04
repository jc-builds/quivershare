// src/routes/profile/edit/+page.server.ts
import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Must be logged in
  if (!locals.session || !locals.user) {
    throw redirect(303, '/login');
  }

  const userId = locals.user.id;

  // Fetch current profile
  const { data: profile, error: profileError } = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, profile_picture_url, location_label, city, region, country, latitude, longitude, home_break_label, home_break_lat, home_break_lon, bio')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw error(404, 'Profile not found');
  }

  return {
    profile
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) {
      throw redirect(303, '/login');
    }

    const formData = await request.formData();
    const bio = formData.get('bio')?.toString() ?? null;
    const home_break_label = formData.get('home_break_label')?.toString() ?? null;
    
    // Home break coordinates (optional)
    const home_break_lat_raw = formData.get('home_break_lat');
    const home_break_lon_raw = formData.get('home_break_lon');
    const home_break_lat = home_break_lat_raw ? Number(home_break_lat_raw) : null;
    const home_break_lon = home_break_lon_raw ? Number(home_break_lon_raw) : null;

    // Handle profile picture upload
    let profile_picture_url: string | null = null;
    const profilePictureFile = formData.get('profile_picture') as File | null;
    const removePicture = formData.get('remove_picture') === 'true';

    if (removePicture) {
      // User wants to remove the picture
      profile_picture_url = null;
      
      // Delete old picture if it exists
      const { data: currentProfile } = await locals.supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', locals.user.id)
        .single();
      
      if (currentProfile?.profile_picture_url && currentProfile.profile_picture_url.includes('profile-pictures')) {
        try {
          const urlParts = currentProfile.profile_picture_url.split('/');
          const oldPath = urlParts.slice(urlParts.indexOf('profile-pictures') + 1).join('/');
          await locals.supabase.storage.from('profile-pictures').remove([oldPath]);
        } catch (e) {
          console.warn('Failed to delete old profile picture:', e);
        }
      }
    } else if (profilePictureFile && profilePictureFile.size > 0) {
      // Upload new profile picture
      const userId = locals.user.id;
      const timestamp = Date.now();
      const fileExtension = profilePictureFile.name.split('.').pop() || 'jpg';
      const filePath = `${userId}/profile-picture-${timestamp}.${fileExtension}`;

      const { error: uploadError, data: uploadData } = await locals.supabase.storage
        .from('profile-pictures')
        .upload(filePath, profilePictureFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Profile picture upload error:', uploadError);
        return fail(500, { 
          message: 'Failed to upload profile picture', 
          error: uploadError.message 
        });
      }

      // Get public URL
      const { data: publicUrlData } = locals.supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);
      
      profile_picture_url = publicUrlData.publicUrl;

      // Delete old profile picture if it exists
      const { data: currentProfile } = await locals.supabase
        .from('profiles')
        .select('profile_picture_url')
        .eq('id', locals.user.id)
        .single();
      
      if (currentProfile?.profile_picture_url && 
          currentProfile.profile_picture_url !== profile_picture_url &&
          currentProfile.profile_picture_url.includes('profile-pictures')) {
        try {
          const urlParts = currentProfile.profile_picture_url.split('/');
          const oldPath = urlParts.slice(urlParts.indexOf('profile-pictures') + 1).join('/');
          await locals.supabase.storage.from('profile-pictures').remove([oldPath]);
        } catch (e) {
          console.warn('Failed to delete old profile picture:', e);
        }
      }
    } else {
      // Keep existing profile picture (don't update the field)
      // Check if profile_picture_url was explicitly set to empty string (remove)
      const profile_picture_url_raw = formData.get('profile_picture_url')?.toString();
      if (profile_picture_url_raw === '') {
        profile_picture_url = null;
      }
      // Otherwise, leave it undefined so we don't update it
    }

    // Build update payload (only include fields that are being updated)
    const update: Record<string, any> = {};
    
    if (bio !== null) update.bio = bio || null;
    if (home_break_label !== null) update.home_break_label = home_break_label || null;
    if (home_break_lat !== null && Number.isFinite(home_break_lat)) update.home_break_lat = home_break_lat;
    if (home_break_lon !== null && Number.isFinite(home_break_lon)) update.home_break_lon = home_break_lon;
    
    // Only update profile_picture_url if it was changed (uploaded, removed, or explicitly set)
    if (profilePictureFile || removePicture || formData.get('profile_picture_url') === '') {
      update.profile_picture_url = profile_picture_url;
    }

    const { error: updateError } = await locals.supabase
      .from('profiles')
      .update(update)
      .eq('id', locals.user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return fail(500, { message: 'Failed to update profile', error: updateError.message });
    }

    // Redirect to profile page
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('username')
      .eq('id', locals.user.id)
      .single();

    if (!profile?.username) {
      return fail(500, { message: 'Failed to redirect', error: 'Username not found' });
    }

    throw redirect(303, `/profile/${profile.username}`);
  }
};
