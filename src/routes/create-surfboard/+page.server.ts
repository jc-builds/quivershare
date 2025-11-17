// src/routes/create-surfboard/+page.server.ts
import { fail, redirect, type Actions } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const form = await request.formData();
    const name = form.get('name')?.toString() ?? '';
    const make = form.get('make')?.toString() ?? '';
    const length = form.get('length') ? Number(form.get('length')) : null;
    const width = form.get('width') ? Number(form.get('width')) : null;
    const thickness = form.get('thickness') ? Number(form.get('thickness')) : null;
    const volume = form.get('volume') ? Number(form.get('volume')) : null;
    const fin_system = form.get('fin_system')?.toString() || null;
    const fin_setup = form.get('fin_setup')?.toString() || null;
    const style = form.get('style')?.toString() || null;
    const price = form.get('price') ? Number(form.get('price')) : null;
    const condition = form.get('condition')?.toString() ?? '';
    const notes = form.get('notes')?.toString() ?? '';
    const thumbnail_url = form.get('thumbnail_url')?.toString() ?? null;
    
    // Location fields
    const city = form.get('city')?.toString() || null;
    const region = form.get('region')?.toString() || null;
    const lat_raw = form.get('lat')?.toString();
    const lon_raw = form.get('lon')?.toString();
    const lat = lat_raw && lat_raw !== '' ? Number(lat_raw) : null;
    const lon = lon_raw && lon_raw !== '' ? Number(lon_raw) : null;

    const { data, error } = await locals.supabase
      .from('surfboards')
      .insert([
        {
          name,
          make,
          length,
          width,
          thickness,
          volume,
          fin_system,
          fin_setup,
          style,
          price,
          condition,
          notes,
          thumbnail_url,
          city,
          region,
          lat,
          lon,
          user_id: user.id
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Insert error:', error.message);
      return fail(500, { message: 'Failed to save surfboard' });
    }

    // Handle image URLs if provided
    const imageUrls = form.getAll('image_urls') as string[];
    if (imageUrls.length > 0 && data?.id) {
      const imageInserts = imageUrls
        .filter(url => url && url.trim() !== '')
        .map(image_url => ({
          surfboard_id: data.id,
          image_url
        }));

      if (imageInserts.length > 0) {
        const { error: imgError } = await locals.supabase
          .from('surfboard_images')
          .insert(imageInserts);

        if (imgError) {
          console.error('Image insert error:', imgError.message);
          // Don't fail the whole request, just log it
        }
      }
    }

    throw redirect(303, '/my-boards');
  },
  uploadImages: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

    const form = await request.formData();
    const surfboardId = form.get('surfboard_id')?.toString();
    const imageUrls = form.getAll('image_urls') as string[];

    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard_id' });
    }

    if (imageUrls.length === 0) {
      return fail(400, { message: 'No image URLs provided' });
    }

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Surfboard not found or access denied' });
    }

    const imageInserts = imageUrls
      .filter(url => url && url.trim() !== '')
      .map(image_url => ({
        surfboard_id: surfboardId,
        image_url
      }));

    const { error: imgError } = await locals.supabase
      .from('surfboard_images')
      .insert(imageInserts);

    if (imgError) {
      console.error('Image insert error:', imgError.message);
      return fail(500, { message: 'Failed to save images' });
    }

    return { success: true };
  }
};
