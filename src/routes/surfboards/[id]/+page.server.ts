// src/routes/surfboards/[id]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the board (public access - anyone can view)
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
    .eq('id', id)
    .single();

  if (boardErr || !surfboard) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the owner's profile
  const { data: ownerProfile, error: ownerError } = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url, city, region')
    .eq('id', surfboard.user_id)
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
