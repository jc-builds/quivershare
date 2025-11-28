// src/routes/onboarding/username/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

const isAutoUsername = (u: string | null | undefined) => !!u && u.startsWith('user_');

const RESERVED = new Set([
  'admin', 'support', 'quivershare', 'api', 'login', 'logout',
  'onboarding', 'my-boards', 'create-surfboard', 'edit-surfboard', 'profile'
]);

export const load: PageServerLoad = async ({ locals, url }) => {
  // Must be logged in - use locals.user as the source of truth
  if (!locals.user) throw redirect(303, '/login');

  const { data: profile, error } = await locals.supabase
    .from('profiles')
    .select('username, is_deleted')
    .eq('id', locals.user.id)
    .maybeSingle();

  if (error) {
    // Don't block onboarding on a transient read failure—send them into the form.
    return {};
  }

  // If profile is deleted, always show onboarding form (reactivation case)
  if (profile?.is_deleted === true) {
    return {};
  }

  // If username exists AND isn't auto-generated, skip onboarding
  if (profile?.username && !isAutoUsername(profile.username)) {
    const to = url.searchParams.get('redirectTo') || '/';
    throw redirect(303, to);
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    // Must be logged in - use locals.user as the source of truth
    if (!locals.user) throw redirect(303, '/login');

    const form = await request.formData();

    // Username (required)
    const usernameRaw = (form.get('username') as string | null) ?? '';
    const username = usernameRaw.toLowerCase().trim();
    const redirectTo = (form.get('redirectTo') as string | null) || url.searchParams.get('redirectTo') || '/';

    // Validate username
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return fail(400, { 
        fieldErrors: { username: 'Use 3–20 chars: a–z, 0–9, _' }, 
        values: { 
          username, 
          full_name: form.get('full_name')?.toString() ?? '',
          home_break_label: form.get('home_break_label')?.toString() ?? '',
          magic_board: form.get('magic_board')?.toString() ?? '',
          redirectTo 
        } 
      });
    }
    if (RESERVED.has(username)) {
      return fail(400, { 
        fieldErrors: { username: 'That name is reserved' }, 
        values: { 
          username,
          full_name: form.get('full_name')?.toString() ?? '',
          home_break_label: form.get('home_break_label')?.toString() ?? '',
          magic_board: form.get('magic_board')?.toString() ?? '',
          redirectTo 
        } 
      });
    }
    // Unique (ignore current user)
    const { data: existing } = await locals.supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .neq('id', locals.user.id)
      .limit(1);
    if (existing && existing.length > 0) {
      return fail(409, { 
        fieldErrors: { username: 'That username is taken' }, 
        values: { 
          username,
          full_name: form.get('full_name')?.toString() ?? '',
          home_break_label: form.get('home_break_label')?.toString() ?? '',
          magic_board: form.get('magic_board')?.toString() ?? '',
          redirectTo 
        } 
      });
    }

    // Full name (optional)
    const full_name = (form.get('full_name') as string | null)?.trim() || null;
    if (full_name && full_name.length > 100) {
      return fail(400, { 
        fieldErrors: { full_name: 'Full name must be 100 characters or less' }, 
        values: { username, full_name, redirectTo } 
      });
    }

    // Magic board (optional)
    const magic_board = (form.get('magic_board') as string | null)?.trim() || null;
    if (magic_board && magic_board.length > 200) {
      return fail(400, { 
        fieldErrors: { magic_board: 'Magic board must be 200 characters or less' }, 
        values: { username, magic_board, redirectTo } 
      });
    }

    // Location (optional)
    const place_id = (form.get('place_id') as string | null) ?? '';
    const place_label = (form.get('place_label') as string | null) ?? '';
    const lat = Number(form.get('lat') ?? '');
    const lon = Number(form.get('lon') ?? '');
    const city = (form.get('city') as string | null) ?? '';
    const region = (form.get('region') as string | null) ?? '';
    const country = (form.get('country') as string | null) ?? '';
    const hasLocation = !!place_id && Number.isFinite(lat) && Number.isFinite(lon);

    // Home break (optional)
    const home_break_label = (form.get('home_break_label') as string | null)?.trim() || null;
    const home_break_lat_raw = form.get('home_break_lat');
    const home_break_lon_raw = form.get('home_break_lon');
    const home_break_lat = home_break_lat_raw && home_break_lat_raw !== '' ? Number(home_break_lat_raw) : null;
    const home_break_lon = home_break_lon_raw && home_break_lon_raw !== '' ? Number(home_break_lon_raw) : null;

    // Handle profile picture upload
    let profile_picture_url: string | null = null;
    const profilePictureFile = form.get('profile_picture') as File | null;
    
    if (profilePictureFile && profilePictureFile.size > 0) {
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
          fieldErrors: { profile_picture: uploadError.message },
          values: { username, redirectTo } 
        });
      }

      // Get public URL
      const { data: publicUrlData } = locals.supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);
      
      profile_picture_url = publicUrlData.publicUrl;
    } else {
      // Set default profile picture URL if not provided
      profile_picture_url = '/default_profile_picture.jpg';
    }

    // Build update payload
    const update: Record<string, any> = { 
      id: locals.user.id, 
      username,
      profile_picture_url,
      is_deleted: false,
      deleted_at: null
    };
    
    if (full_name !== null) {
      update.full_name = full_name;
    }
    
    if (hasLocation) {
      update.location_label = place_label;
      update.latitude = lat;
      update.longitude = lon;
      update.city = city;
      update.region = region;
      update.country = country;
    }
    
    if (home_break_label !== null) {
      update.home_break_label = home_break_label;
    }
    
    if (home_break_lat !== null && Number.isFinite(home_break_lat)) {
      update.home_break_lat = home_break_lat;
    }
    
    if (home_break_lon !== null && Number.isFinite(home_break_lon)) {
      update.home_break_lon = home_break_lon;
    }
    
    if (magic_board !== null) {
      update.magic_board = magic_board;
    }

    // 👇 use upsert so new users create their profile row
    const { error: upsertErr } = await locals.supabase
      .from('profiles')
      .upsert(update, { onConflict: 'id' })  // insert if missing, update if exists
      .select('id');                         // optional: force the write to complete before redirect

    if (upsertErr) {
      console.error('Profile upsert error:', upsertErr);
      return fail(500, { 
        message: 'Could not save profile', 
        values: { username, redirectTo } 
      });
    }

    throw redirect(303, redirectTo);
  }
};
