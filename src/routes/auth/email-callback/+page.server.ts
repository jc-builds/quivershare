import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
  const code = url.searchParams.get('code');

  if (!code) {
    throw redirect(303, '/login');
  }

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw redirect(303, '/login');
  }

  throw redirect(303, '/');
};
