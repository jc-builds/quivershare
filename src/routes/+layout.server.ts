// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const ALLOW = new Set<string>(['/', '/login', '/logout', '/onboarding/username']);

// Treat usernames like "user_xxx" as auto-generated (needs onboarding)
const isAutoUsername = (u: string | null | undefined) => !!u && u.startsWith('user_');

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const session = (await locals.getSession?.()) ?? null;
  const user = locals.user;

  let profile: { username: string | null; profile_picture_url: string | null } | null = null;
  let boostCredits: { total_credits: number | null } | null = null;

  if (user) {
    const { data } = await locals.supabase
      .from('profiles')
      .select('username, profile_picture_url, is_deleted')
      .eq('id', user.id)
      .maybeSingle();

    profile = data ?? null;

    // If profile is deleted, redirect to onboarding for reactivation
    if (profile && profile.is_deleted === true) {
      const pathname = url.pathname;
      // Only redirect if not already on onboarding page
      if (pathname !== '/onboarding/username') {
        throw redirect(303, '/onboarding/username?reactivate=1');
      }
      // If already on onboarding, let them through
    }

    // Fetch boost credits for authenticated users
    const { data: creditsRow, error: creditsError } = await locals.supabase
      .from('boost_credits')
      .select('total_credits')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!creditsError && creditsRow) {
      boostCredits = {
        total_credits: creditsRow.total_credits ?? null
      };
    } else {
      boostCredits = {
        total_credits: null
      };
    }

    // If logged in but missing/auto username, force onboarding (except on allowed paths)
    const pathname = url.pathname;
    const isAllowlisted =
      ALLOW.has(pathname) || pathname.startsWith('/auth'); // covers /auth and /auth/callback

    if ((!profile?.username || isAutoUsername(profile?.username)) && !isAllowlisted) {
      const redirectTo = encodeURIComponent(pathname + (url.search || ''));
      throw redirect(303, `/onboarding/username?redirectTo=${redirectTo}`);
    }
  }

  return {
    session,
    user,
    profile,
    boostCredits
  };
};
