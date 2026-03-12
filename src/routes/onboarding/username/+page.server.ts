// src/routes/onboarding/username/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { parseLocation, LocationValidationError } from '$lib/server/location';

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

    // Location (optional — uses shared validator)
    let location;
    try {
      location = parseLocation(form);
    } catch (e) {
      if (e instanceof LocationValidationError) {
        return fail(400, {
          message: e.message,
          values: { username, redirectTo }
        });
      }
      throw e;
    }

    // Home break (plain text only)
    const home_break_label = (form.get('home_break_label') as string | null)?.trim() || null;

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
    
    if (location) {
      update.location_label = location.label;
      update.latitude = location.lat;
      update.longitude = location.lon;
      update.city = location.city;
      update.region = location.region;
      update.country = location.country;
    }
    
    if (home_break_label !== null) {
      update.home_break_label = home_break_label;
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
