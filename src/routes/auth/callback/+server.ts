import { redirect, type RequestHandler } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

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

  const { data: { user } } = await locals.supabase.auth.getUser();

  if (user && user.email) {
    const normalizedEmail = user.email.toLowerCase();

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: normalizedEmail,
          auth_provider: 'google'
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('profile upsert error:', profileError);
    }
  }

  throw redirect(303, next);
};
