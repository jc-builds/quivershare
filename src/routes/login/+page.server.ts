import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Prevent this page from inheriting session logic
  // and ensure it always renders immediately
  return {};
};
