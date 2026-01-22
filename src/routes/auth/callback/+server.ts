import { redirect, type RequestHandler } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const GET: RequestHandler = async ({ url, locals }) => {
  console.log('AUTH CALLBACK HIT', url.toString());

  const code = url.searchParams.get('code');
  const next = url.searchParams.get('redirect_to') ?? '/onboarding/username';

  if (!code) throw redirect(303, '/login');

  // 1. Let Supabase complete OAuth + create session
  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('OAuth exchange error:', error.message);
    throw redirect(303, '/login');
  }

  // 2. Fetch the authenticated user
  const {
    data: { user }
  } = await locals.supabase.auth.getUser();

  if (!user || !user.email) {
    // Defensive fallback
    await locals.supabase.auth.signOut();
    throw redirect(303, '/login');
  }

  const normalizedEmail = user.email.toLowerCase();

  // 3. Read existing profile (source of truth for provider)
  const { data: profile, error: profileReadError } = await supabaseAdmin
    .from('profiles')
    .select('auth_provider')
    .eq('id', user.id)
    .maybeSingle();

  if (profileReadError) {
    console.error('profile read error:', profileReadError);
    await locals.supabase.auth.signOut();
    throw redirect(303, '/login');
  }

  // 4. 🚫 BLOCK OAuth if account was created with email/password
  if (profile?.auth_provider === 'email') {
    await locals.supabase.auth.signOut();

    throw redirect(
      303,
      '/login?error=oauth_not_allowed'
    );
  }

  // 5. First-time OAuth user → create profile (idempotent)
  if (!profile) {
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: normalizedEmail,
          auth_provider: 'google'
        },
        { onConflict: 'id' }
      );

    if (profileUpsertError) {
      console.error('profile upsert error:', profileUpsertError);
      // Do NOT block login here — profile creation failure should not strand user
    }
  }

  // 6. Allowed OAuth login → continue
  throw redirect(303, next);
};
