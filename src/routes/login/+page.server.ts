// src/routes/login/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async () => {
  return {};
};

const GOOGLE_ONLY_ERROR =
  'This account was created with Google. Please sign in with Google.';

const hasGoogleOnlyProvider = (user: unknown) => {
  const providers = (user as { raw_app_meta_data?: { providers?: unknown } } | null)
    ?.raw_app_meta_data?.providers;
  return Array.isArray(providers) && providers.includes('google') && !providers.includes('email');
};

const guardGoogleOnly = async (email: string) => {
  try {
    const { data } =
      await supabaseAdmin.auth.admin.getUserByEmail(email);

    const providers = data?.user?.raw_app_meta_data?.providers;

    if (
      Array.isArray(providers) &&
      providers.includes('google') &&
      !providers.includes('email')
    ) {
      return { error: GOOGLE_ONLY_ERROR };
    }

    return { error: null };
  } catch (err) {
    // User not found is NOT an error for our purposes
    if (
      typeof err === 'object' &&
      err !== null &&
      'message' in err &&
      String((err as any).message).toLowerCase().includes('not found')
    ) {
      return { error: null };
    }

    console.error('guardGoogleOnly error:', err);
    return { error: 'Unable to verify account provider. Please try again.' };
  }
};

export const actions: Actions = {
  login: async ({ request, locals }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required.' });
    }

    const { error: providerError } = await guardGoogleOnly(email);
    if (providerError) {
      return fail(400, { error: providerError });
    }

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

    const { error: providerError } = await guardGoogleOnly(email);
    if (providerError) {
      return fail(400, { error: providerError });
    }

    const emailRedirectTo = `${url.origin}/auth/email-callback`;
    const { error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo }
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    return { success: true, next: '/login?checkEmail=1' };
  }
};
