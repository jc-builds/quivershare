import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async () => {
  return {};
};

const GOOGLE_ONLY_ERROR =
  'This account was created with Google. Please sign in with Google.';

const guardGoogleOnly = async (email: string) => {
  const normalizedEmail = email.toLowerCase();

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('auth_provider')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error('guardGoogleOnly error:', error);
    return {
      block: false,
      error: 'Unable to verify account provider. Please try again.'
    };
  }

  if (profile?.auth_provider === 'google') {
    return {
      block: true,
      error: GOOGLE_ONLY_ERROR
    };
  }

  return {
    block: false,
    error: null
  };
};

export const actions: Actions = {
  login: async ({ request, locals }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required.' });
    }

    const { block, error: providerError } = await guardGoogleOnly(email);
    if (block) {
      return fail(400, { error: providerError });
    }
    if (providerError) {
      return fail(400, { error: providerError });
    }

    // Only now do we touch Supabase Auth
    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    return { success: true, next: '/' };
  },

  signup: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required.' });
    }

    const { block, error: providerError } = await guardGoogleOnly(email);
    if (block) {
      return fail(400, { error: providerError });
    }
    if (providerError) {
      return fail(400, { error: providerError });
    }

    const normalizedEmail = email.toLowerCase();
    const emailRedirectTo = `${url.origin}/auth/email-callback`;

    // Only now do we touch Supabase Auth
    const { data, error } = await locals.supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { emailRedirectTo }
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            email: normalizedEmail,
            auth_provider: 'email'
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        console.error('profile upsert error:', profileError);
        return fail(500, {
          error: 'Unable to create profile. Please try again.'
        });
      }
    }

    return { success: true, next: '/login?checkEmail=1' };
  }
};