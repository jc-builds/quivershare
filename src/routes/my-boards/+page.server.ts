// src/routes/my-boards/+page.server.ts
import { redirect, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // 1) Require a verified user (from hooks.server.ts -> getUser())
  if (!locals.user) throw redirect(303, '/login');
  const userId = locals.user.id;

  // 2) Fetch only this user's boards (exclude deleted)
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
      created_at,
      state,
      surfboard_images(image_url),
      boosts(status)
    `)
    .eq('user_id', userId)
    .eq('is_deleted', false)
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

export const actions: Actions = {
  updateState: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { context: 'updateState', success: false, message: 'Unauthorized' });
    }

    const form = await request.formData();
    const boardId = form.get('boardId')?.toString();
    const newState = form.get('state')?.toString();

    if (!boardId) {
      return fail(400, { context: 'updateState', success: false, message: 'Missing board ID' });
    }

    if (newState !== 'active' && newState !== 'inactive') {
      return fail(400, { context: 'updateState', success: false, message: 'Invalid state value' });
    }

    // Verify the board belongs to the user and is not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('user_id')
      .eq('id', boardId)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { context: 'updateState', success: false, message: 'Surfboard not found' });
    }

    if (board.user_id !== user.id) {
      return fail(403, { context: 'updateState', success: false, message: 'Access denied' });
    }

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update({ state: newState })
      .eq('id', boardId);

    if (updateError) {
      console.error('State update error:', updateError.message);
      return fail(500, { context: 'updateState', success: false, message: 'Failed to update state' });
    }

    return { context: 'updateState', success: true, state: newState, boardId };
  }
};
