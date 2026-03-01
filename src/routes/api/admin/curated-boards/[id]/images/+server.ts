import { json, error } from '@sveltejs/kit';
import {
  validateImageUrls,
  MAX_IMAGES_PER_LISTING
} from '$lib/server/imageValidation';

export const POST = async ({ request, locals, params }) => {
  const user = locals.user;
  if (!user) throw error(401, 'Unauthorized');

  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) throw error(403, 'Admin only');

  const surfboardId = params.id;
  if (!surfboardId) throw error(400, 'Missing surfboard ID');

  const { data: board, error: boardError } = await locals.supabase
    .from('surfboards')
    .select('id')
    .eq('id', surfboardId)
    .eq('is_curated', true)
    .eq('is_deleted', false)
    .single();

  if (boardError || !board) {
    throw error(404, 'Curated surfboard not found');
  }

  const form = await request.formData();
  const rawImageUrls = form.getAll('image_urls');
  const cleanedUrls = validateImageUrls(rawImageUrls);

  if (cleanedUrls.length === 0) {
    throw error(400, 'No image URLs provided');
  }

  const { count: existingCount } = await locals.supabase
    .from('surfboard_images')
    .select('*', { count: 'exact', head: true })
    .eq('surfboard_id', surfboardId);

  if ((existingCount ?? 0) + cleanedUrls.length > MAX_IMAGES_PER_LISTING) {
    throw error(400, 'Maximum 6 images allowed.');
  }

  const { data: existingImages } = await locals.supabase
    .from('surfboard_images')
    .select('position')
    .eq('surfboard_id', surfboardId)
    .order('position', { ascending: false })
    .limit(1);

  const currentMax = existingImages?.[0]?.position ?? -1;

  const imageInserts = cleanedUrls.map((image_url, index) => ({
    surfboard_id: surfboardId,
    image_url,
    position: currentMax + 1 + index
  }));

  const { data: insertedImages, error: imgError } = await locals.supabase
    .from('surfboard_images')
    .insert(imageInserts)
    .select('id, image_url, position');

  if (imgError) {
    throw error(500, 'Failed to save images');
  }

  return json({
    success: true,
    images: insertedImages ?? []
  });
};
