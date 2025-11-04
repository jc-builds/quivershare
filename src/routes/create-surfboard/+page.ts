import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, url }) => {
  const { session } = await parent();
  if (!session) {
    const redirectTo = encodeURIComponent(url.pathname + url.search);
    throw redirect(303, `/login?redirectTo=${redirectTo}`);
  }
  return {};
};
