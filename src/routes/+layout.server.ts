// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { isAutoUsername } from '$lib/validation/username';

const ALLOW_PREFIXES = ['/login', '/logout', '/onboarding', '/auth'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
  const session = (await locals.getSession?.()) ?? null;
  const user = locals.user;

  let profile = null;

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
  }

  let shopSlug: string | null = null;
  if (user) {
    const { data: shopRow } = await locals.supabase
      .from('shops')
      .select('slug')
      .eq('owner_user_id', user.id)
      .maybeSingle();
    shopSlug = shopRow?.slug ?? null;
  }

  return {
    session,
    user,
    profile,
    shopSlug
  };
};
