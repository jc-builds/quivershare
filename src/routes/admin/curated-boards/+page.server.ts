// src/routes/admin/curated-boards/+page.server.ts
import { redirect, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Require admin (gated by parent layout)
  if (!locals.user) throw redirect(303, '/');

  // Fetch curated boards only
  const { data, error } = await locals.supabase
    .from('surfboards')
    .select(`
      id,
      name,
      thumbnail_url,
      created_at,
      state,
      source_type,
      source_url,
      city,
      region,
      surfboard_images(image_url)
    `)
    .eq('is_curated', true)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  // Handle errors
  if (error) {
    console.error('Error loading curated boards:', error);
    return { boards: [], errorMessage: error.message };
  }

  // Attach a single fallback image per board
  const boardsWithImage = (data ?? []).map((board) => ({
    ...board,
    image_url: board.surfboard_images?.[0]?.image_url || null
  }));

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

    // Verify the board is curated and not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('is_curated')
      .eq('id', boardId)
      .eq('is_curated', true)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { context: 'updateState', success: false, message: 'Curated board not found' });
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
  },

  deleteBoard: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { context: 'deleteBoard', success: false, message: 'Unauthorized' });
    }

    const form = await request.formData();
    const boardId = form.get('boardId')?.toString();

    if (!boardId) {
      return fail(400, { context: 'deleteBoard', success: false, message: 'Missing board ID' });
    }

    // Verify the board is curated and not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('is_curated')
      .eq('id', boardId)
      .eq('is_curated', true)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { context: 'deleteBoard', success: false, message: 'Curated board not found' });
    }

    // Delete the board (set is_deleted to true)
    const { error: deleteError } = await locals.supabase
      .from('surfboards')
      .update({ is_deleted: true, state: 'inactive' })
      .eq('id', boardId);

    if (deleteError) {
      console.error('Board delete error:', deleteError.message);
      return fail(500, { context: 'deleteBoard', success: false, message: 'Failed to delete board' });
    }

    throw redirect(303, '/admin/curated-boards');
  }
};

