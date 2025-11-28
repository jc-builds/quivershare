// src/routes/profile/edit/+page.server.ts
import { redirect, fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Must be logged in - use locals.user as the source of truth
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  const userId = locals.user.id;

  // Fetch current profile
  const { data: profile, error: profileError } = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url, location_label, city, region, country, latitude, longitude, home_break_label, home_break_lat, home_break_lon, bio, is_deleted')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('Error loading profile for edit:', profileError);
    throw error(500, 'Failed to load profile');
  }

  if (!profile) {
    throw error(404, 'Profile not found');
  }

  // Check if profile is deleted
  if (profile.is_deleted) {
    // Sign out and redirect to goodbye page
    await locals.supabase.auth.signOut();
    throw redirect(303, '/goodbye');
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
    const intent = formData.get('intent')?.toString() ?? 'updateProfile';

    // Handle account deletion
    if (intent === 'deleteAccount') {
      const userId = locals.user.id;
      const confirmText = formData.get('confirm_text')?.toString() || '';

      // Validate confirmation text
      if (confirmText !== 'DELETE') {
        return fail(400, { 
          message: 'Confirmation text must be exactly "DELETE"',
          error: 'Invalid confirmation' 
        });
      }

      try {
        // Fetch user's profile
        const { data: profile, error: profileError } = await locals.supabase
          .from('profiles')
          .select('id, username, profile_picture_url')
          .eq('id', userId)
          .single();

        if (profileError || !profile) {
          console.error('Profile not found for deletion:', profileError);
          // Continue with best-effort cleanup
        }

        // Fetch user's surfboards
        const { data: surfboards, error: boardsError } = await locals.supabase
          .from('surfboards')
          .select('id')
          .eq('user_id', userId);

        if (boardsError) {
          console.error('Error fetching surfboards for deletion:', boardsError);
        }

        const boardIds = (surfboards || []).map(b => b.id);

        // Fetch associated images
        let imageUrls: string[] = [];
        if (boardIds.length > 0) {
          const { data: images, error: imagesError } = await locals.supabase
            .from('surfboard_images')
            .select('image_url')
            .in('surfboard_id', boardIds);

          if (!imagesError && images) {
            imageUrls = images.map(img => img.image_url).filter(Boolean) as string[];
          }
        }

        // Soft delete surfboards
        if (boardIds.length > 0) {
          const { error: deleteBoardsError } = await locals.supabase
            .from('surfboards')
            .update({ 
              is_deleted: true, 
              deleted_at: new Date().toISOString() 
            })
            .eq('user_id', userId);

          if (deleteBoardsError) {
            console.error('Error soft-deleting surfboards:', deleteBoardsError);
            return fail(500, { 
              message: 'Failed to delete account',
              error: 'Error deleting surfboards' 
            });
          }
        }

        // Delete surfboard images from storage
        if (imageUrls.length > 0) {
          const imagePaths: string[] = [];
          for (const url of imageUrls) {
            if (url.includes('surfboard-images')) {
              const parts = url.split('/');
              const bucketIdx = parts.findIndex(p => p === 'surfboard-images');
              if (bucketIdx >= 0) {
                const path = parts.slice(bucketIdx + 1).join('/');
                imagePaths.push(path);
              }
            }
          }

          if (imagePaths.length > 0) {
            const { error: deleteImagesError } = await locals.supabase.storage
              .from('surfboard-images')
              .remove(imagePaths);

            if (deleteImagesError) {
              console.error('Error deleting surfboard images from storage:', deleteImagesError);
              // Continue - don't fail the whole operation
            }
          }

          // Delete surfboard_images rows
          if (boardIds.length > 0) {
            await locals.supabase
              .from('surfboard_images')
              .delete()
              .in('surfboard_id', boardIds);
          }
        }

        // Cancel active boosts for this user
        const { error: cancelBoostsError } = await locals.supabase
          .from('boosts')
          .update({ status: 'canceled' })
          .eq('user_id', userId)
          .in('status', ['pending', 'live']);

        if (cancelBoostsError) {
          console.error('Failed to cancel boosts during account deletion:', cancelBoostsError);
          // Continue - don't fail the whole operation
        }

        // Reset boost credits to 0
        const { error: resetCreditsError } = await locals.supabase
          .from('boost_credits')
          .update({ 
            free_credits: 0,
            paid_credits: 0,
            total_credits: 0
          })
          .eq('user_id', userId);

        if (resetCreditsError) {
          console.error('Error resetting boost credits:', resetCreditsError);
          // Continue - don't fail the whole operation
        }

        // Delete profile picture from storage
        if (profile?.profile_picture_url && profile.profile_picture_url.includes('profile-pictures')) {
          try {
            const urlParts = profile.profile_picture_url.split('/');
            const oldPath = urlParts.slice(urlParts.indexOf('profile-pictures') + 1).join('/');
            await locals.supabase.storage.from('profile-pictures').remove([oldPath]);
          } catch (e) {
            console.warn('Failed to delete profile picture from storage:', e);
            // Continue - don't fail the whole operation
          }
        }

        // Soft delete and anonymize profile
        const anonymizedUsername = profile 
          ? `deleted_user_${profile.id.substring(0, 8)}`
          : `deleted_user_${userId.substring(0, 8)}`;

        const { error: updateProfileError } = await locals.supabase
          .from('profiles')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            full_name: null,
            bio: null,
            location_label: null,
            city: null,
            region: null,
            country: null,
            latitude: null,
            longitude: null,
            home_break_label: null,
            home_break_lat: null,
            home_break_lon: null,
            username: anonymizedUsername,
            profile_picture_url: null
          })
          .eq('id', userId);

        if (updateProfileError) {
          console.error('Error soft-deleting profile:', updateProfileError);
          return fail(500, { 
            message: 'Failed to delete account',
            error: 'Error deleting profile' 
          });
        }

        // TODO: In a future iteration, use Supabase Admin API with service-role client
        // to call auth.admin.deleteUser(userId) after offboarding completes successfully

        // Sign out the user
        await locals.supabase.auth.signOut();

        // Redirect to goodbye page
        throw redirect(303, '/goodbye');
      } catch (err) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
          // Re-throw redirects
          throw err;
        }
        console.error('Error during account deletion:', err);
        return fail(500, { 
          message: 'Failed to delete account. Please try again.',
          error: 'Unexpected error' 
        });
      }
    }

    // Handle profile update (default branch)
    // Use the same formData from above
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
