import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  const type = url.searchParams.get('type');

  // Optional: sanity check, but not strictly required
  if (type !== 'signup' && type !== 'email') {
    throw redirect(303, '/login');
  }

  // Email is now verified by Supabase at this point
  // We intentionally do NOT create a session here
  throw redirect(303, '/login?verified=1');
};
