import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { TURNSTILE_SECRET_KEY } from '$env/static/private';

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
    const rawRedirect = form.get('redirectTo')?.toString() || '/';
    const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

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

    return { success: true, next: redirectTo };
  },

  signup: async ({ request, locals, url }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const rawRedirect = form.get('redirectTo')?.toString() || '';
    const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '';

    const turnstileToken = form.get('cf-turnstile-response')?.toString() ?? '';
    if (!turnstileToken) {
      return fail(400, { error: 'Please complete the verification check.' });
    }

    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET_KEY,
          response: turnstileToken
        })
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return fail(400, { error: 'Verification failed. Please try again.' });
      }
    } catch (e) {
      console.error('Turnstile verification error:', e);
      return fail(500, { error: 'Unable to verify request. Please try again.' });
    }

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
    const emailRedirectTo = redirectTo
      ? `${url.origin}/auth/email-callback?redirectTo=${encodeURIComponent(redirectTo)}`
      : `${url.origin}/auth/email-callback`;

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

    const checkEmailUrl = redirectTo
      ? `/login?checkEmail=1&redirectTo=${encodeURIComponent(redirectTo)}`
      : '/login?checkEmail=1';
    return { success: true, next: checkEmailUrl };
  }
};