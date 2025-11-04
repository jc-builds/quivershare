// src/routes/onboarding/username/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

const isAutoUsername = (u: string | null | undefined) => !!u && u.startsWith('user_');

const RESERVED = new Set([
  'admin', 'support', 'quivershare', 'api', 'login', 'logout',
  'onboarding', 'my-boards', 'create-surfboard', 'edit-surfboard'
]);

export const load: PageServerLoad = async ({ locals, url }) => {
  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) throw redirect(303, '/login');

  const { data: profile, error } = await locals.supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    // Don’t block onboarding on a transient read failure—send them into the form.
    return {};
  }

  // If username exists AND isn’t auto-generated, skip onboarding
  if (profile?.username && !isAutoUsername(profile.username)) {
    const to = url.searchParams.get('redirectTo') || '/';
    throw redirect(303, to);
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    const { data: { session } } = await locals.supabase.auth.getSession();
    if (!session) throw redirect(303, '/login');

    const form = await request.formData();

    // Username (existing logic)
    const usernameRaw = (form.get('username') as string | null) ?? '';
    const username = usernameRaw.toLowerCase().trim();
    const redirectTo = (form.get('redirectTo') as string | null) || url.searchParams.get('redirectTo') || '/';

    // Validate username
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return fail(400, { fieldErrors: { username: 'Use 3–20 chars: a–z, 0–9, _' }, values: { username, redirectTo } });
    }
    if (RESERVED.has(username)) {
      return fail(400, { fieldErrors: { username: 'That name is reserved' }, values: { username, redirectTo } });
    }
    // Unique (ignore current user)
    const { data: existing } = await locals.supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .neq('id', session.user.id)
      .limit(1);
    if (existing && existing.length > 0) {
      return fail(409, { fieldErrors: { username: 'That username is taken' }, values: { username, redirectTo } });
    }

    // --- Location payload from form (optional, but if present must be formed from our suggestions) ---
    const place_id = (form.get('place_id') as string | null) ?? '';
    const place_label = (form.get('place_label') as string | null) ?? '';
    const lat = Number(form.get('lat') ?? '');
    const lon = Number(form.get('lon') ?? '');
    const city = (form.get('city') as string | null) ?? '';
    const region = (form.get('region') as string | null) ?? '';
    const country = (form.get('country') as string | null) ?? '';

    // Treat as provided only if there's a place_id (selected from dropdown)
    const hasLocation = !!place_id && Number.isFinite(lat) && Number.isFinite(lon);

    // Build update payload
    const update: Record<string, any> = { id: session.user.id, username };
    if (hasLocation) {
      update.location_label = place_label;
      update.latitude = lat;
      update.longitude = lon;
      update.city = city;
      update.region = region;
      update.country = country;
    }

    // 👇 use upsert so new users create their profile row
    const { error: upsertErr } = await locals.supabase
      .from('profiles')
      .upsert(update, { onConflict: 'id' })  // insert if missing, update if exists
      .select('id');                         // optional: force the write to complete before redirect

    if (upsertErr) {
      return fail(500, { message: 'Could not save profile', values: { username, redirectTo } });
    }

    throw redirect(303, redirectTo);
  }
};
