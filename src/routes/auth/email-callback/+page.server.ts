import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
  const redirectTo = url.searchParams.get('redirectTo');
  const loginUrl = redirectTo
    ? `/login?verified=1&redirectTo=${encodeURIComponent(redirectTo)}`
    : '/login?verified=1';
  throw redirect(303, loginUrl);
};
