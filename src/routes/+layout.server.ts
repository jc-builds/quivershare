// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const ALLOW = new Set<string>(['/', '/login', '/logout', '/onboarding/username']);

// Treat usernames like "user_xxx" as auto-generated (needs onboarding)
const isAutoUsername = (u: string | null | undefined) => !!u && u.startsWith('user_');

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const session = (await locals.getSession?.()) ?? locals.session ?? null;
  const user = session?.user ?? null;

  let profile: { username: string | null } | null = null;

  if (user) {
    const { data } = await locals.supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    profile = data ?? null;

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
    profile
  };
};
