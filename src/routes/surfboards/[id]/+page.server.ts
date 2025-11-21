// src/routes/surfboards/[id]/+page.server.ts
import { error, fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the board (public access - anyone can view, but exclude deleted)
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  if (boardErr || !surfboard) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the owner's profile (exclude deleted)
  const { data: ownerProfile, error: ownerError } = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url, city, region, is_deleted')
    .eq('id', surfboard.user_id)
    .eq('is_deleted', false)
    .single();

  if (ownerError) {
    console.warn('Error loading owner profile:', ownerError);
  }

  // Fetch images
  const { data: images, error: imgErr } = await locals.supabase
    .from('surfboard_images')
    .select('id, image_url')
    .eq('surfboard_id', id)
    .order('id', { ascending: true });

  if (imgErr) {
    console.warn('Image fetch error:', imgErr.message);
  }

  // Determine if the current user can edit this board
  const { data: authData, error: userError } = await locals.supabase.auth.getUser();
  if (userError) {
    console.warn('Error fetching current user for board detail:', userError);
  }
  const currentUserId = authData?.user?.id ?? null;
  const canEdit = Boolean(currentUserId && surfboard.user_id === currentUserId);

  // Get up to 5 images (thumbnail + up to 4 additional)
  const allImages = [
    ...(surfboard.thumbnail_url ? [{ id: 'thumb', image_url: surfboard.thumbnail_url }] : []),
    ...(images ?? [])
  ].filter((img, index, self) => 
    index === self.findIndex((i) => i.image_url === img.image_url)
  ).slice(0, 5);

  return {
    board: surfboard,
    images: allImages,
    owner: ownerProfile ?? null,
    canEdit
  };
};

export const actions: Actions = {
  updateState: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const id = params.id;
    if (!id) {
      return fail(400, { message: 'Missing board ID' });
    }

    // Verify the board belongs to the user and is not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('user_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { message: 'Surfboard not found' });
    }

    if (board.user_id !== user.id) {
      return fail(403, { message: 'Access denied' });
    }

    const form = await request.formData();
    const newState = form.get('state')?.toString();

    if (newState !== 'active' && newState !== 'inactive') {
      return fail(400, { message: 'Invalid state value' });
    }

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update({ state: newState })
      .eq('id', id);

    if (updateError) {
      console.error('State update error:', updateError.message);
      return fail(500, { message: 'Failed to update state' });
    }

    return { success: true, state: newState };
  }
};
