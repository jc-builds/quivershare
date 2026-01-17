import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
  console.log('AUTH CALLBACK HIT', url.toString());

  const code = url.searchParams.get('code');
  const next = url.searchParams.get('redirect_to') ?? '/onboarding/username';

  if (!code) throw redirect(303, '/login');

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('OAuth exchange error:', error.message);
    throw redirect(303, '/login');
  }

  throw redirect(303, next);
};
