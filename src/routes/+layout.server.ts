// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const ALLOW_PREFIXES = ['/login', '/logout', '/onboarding', '/auth'];

const isAutoUsername = (u: string | null | undefined) =>
  !!u && u.startsWith('user_');

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const session = (await locals.getSession?.()) ?? null;
  const user = locals.user;

  let profile = null;
  let boostCredits = null;

  if (user) {
    const { data } = await locals.supabase
      .from('profiles')
      .select('username, profile_picture_url, is_deleted')
      .eq('id', user.id)
      .maybeSingle();

    profile = data ?? null;

    const pathname = url.pathname;
    const isAllowlisted = ALLOW_PREFIXES.some((p) =>
      pathname === p || pathname.startsWith(p)
    );

    if (profile?.is_deleted === true && !isAllowlisted) {
      throw redirect(303, '/onboarding/username?reactivate=1');
    }

    if ((!profile?.username || isAutoUsername(profile.username)) && !isAllowlisted) {
      const redirectTo = encodeURIComponent(pathname + (url.search || ''));
      throw redirect(303, `/onboarding/username?redirectTo=${redirectTo}`);
    }

    const { data: creditsRow } = await locals.supabase
      .from('boost_credits')
      .select('total_credits')
      .eq('user_id', user.id)
      .maybeSingle();

    boostCredits = creditsRow
      ? { total_credits: creditsRow.total_credits ?? null }
      : { total_credits: null };
  }

  return {
    session,
    user,
    profile,
    boostCredits
  };
};
