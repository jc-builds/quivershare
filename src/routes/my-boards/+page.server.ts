// src/routes/my-boards/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // 1) Require a verified user (from hooks.server.ts -> getUser())
  if (!locals.user) throw redirect(303, '/login');
  const userId = locals.user.id;

  // 2) Fetch only this user's boards
  const { data, error } = await locals.supabase
    .from('surfboards')
    .select(`
      id,
      name,
      thumbnail_url,
      length,
      width,
      thickness,
      condition,
      surfboard_images(image_url),
      boosts(status)
    `)
    .eq('user_id', userId)
    .order('last_modified', { ascending: false });

  // 3) Handle errors
  if (error) {
    console.error('Error loading boards:', error);
    return { boards: [], errorMessage: error.message };
  }

  // 4) Attach a single fallback image per board
  const boardsWithImage = (data ?? []).map((board) => ({
    ...board,
    image_url: board.surfboard_images?.[0]?.image_url || null,
    boosts: board.boosts ?? []
  }));

  // 5) Return to +page.svelte
  return {
    boards: boardsWithImage,
    errorMessage: null
  };
};
