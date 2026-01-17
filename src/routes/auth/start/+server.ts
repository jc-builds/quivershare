// src/routes/auth/start/+server.ts
// Default OAuth landing must enforce onboarding.
// Never default to '/' here.

import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
  const next =
    url.searchParams.get('redirect_to') ?? '/onboarding/username';

  const redirectTo = `${url.origin}/auth/callback?redirect_to=${encodeURIComponent(next)}`;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`OAuth redirectTo: ${redirectTo}`);
  }

  const { data, error } = await locals.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo
    }
  });

  if (error || !data?.url) {
    console.error('OAuth start error:', error?.message);
    throw redirect(303, '/login');
  }

  throw redirect(303, data.url);
};
