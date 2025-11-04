import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
  // where to return after the server callback completes
  const next = url.searchParams.get('redirect_to') ?? '/my-boards';

  const { data, error } = await locals.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${url.origin}/auth/callback?redirect_to=${encodeURIComponent(next)}`
    }
  });

  if (error || !data?.url) {
    console.error('OAuth start error:', error?.message);
    throw redirect(303, '/login');
  }

  // This redirect sends the user to Google. PKCE verifier is now stored in a cookie.
  throw redirect(303, data.url);
};
