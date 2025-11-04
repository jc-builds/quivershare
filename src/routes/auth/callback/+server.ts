import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('redirect_to') ?? '/my-boards';

  if (!code) throw redirect(303, '/login');

  // Now the server has access to the PKCE verifier cookie set in step 1
  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('PKCE exchange error:', error.message);
    throw redirect(303, '/login');
  }

  throw redirect(303, next);
};
