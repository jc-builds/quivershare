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
    .select('id, username, full_name, avatar_url, profile_picture_url')
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

  // Check if current user owns this board
  const currentUserId = locals.user?.id ?? null;
  const isOwner = currentUserId === surfboard.user_id;

  return {
    surfboard,
    images: images ?? [],
    owner: ownerProfile ?? null,
    isOwner
  };
};

