// src/routes/edit-surfboard/[id]/+page.server.ts
import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  // Must be logged in
  if (!locals.session) throw redirect(303, '/login');
  const uid = locals.user?.id;
  if (!uid) throw redirect(303, '/login');

  const id = params.id;

  // Fetch the board for THIS user
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
    .eq('id', id)
    .eq('user_id', uid)
    .single();

  if (boardErr || !surfboard) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch images
  const { data: images, error: imgErr } = await locals.supabase
    .from('surfboard_images')
    .select('id,image_url')
    .eq('surfboard_id', id)
    .order('id', { ascending: true });

  if (imgErr) {
    console.warn('Image fetch error:', imgErr.message);
  }

  return {
    surfboard,
    existingImages: images ?? []
  };
};
