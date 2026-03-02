// src/routes/create-surfboard/+page.server.ts
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { validateImageUrls } from '$lib/server/imageValidation';

const ALLOWED_STYLES = ['Shortboard', 'Mid-length', 'Longboard', 'Groveler / Fish', 'Gun', 'Groveler'] as const;
const ALLOWED_FIN_SYSTEMS = ['FCS', 'FCS II', 'Futures', 'Glass On', 'Single Fin Box'] as const;
const ALLOWED_FIN_SETUPS = ['Single', '2+1', 'Twin', 'Twin + Trailer', 'Twinzer', 'Tri', 'Quad', 'Tri/Quad', 'Bonzer', '4+1'] as const;

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
    
    // Location fields
    const city = form.get('city')?.toString() || null;
    const region = form.get('region')?.toString() || null;
    const lat_raw = form.get('lat')?.toString();
    const lon_raw = form.get('lon')?.toString();
    const lat = lat_raw && lat_raw !== '' ? Number(lat_raw) : null;
    const lon = lon_raw && lon_raw !== '' ? Number(lon_raw) : null;

    if (style && !ALLOWED_STYLES.includes(style as (typeof ALLOWED_STYLES)[number])) {
      return fail(400, { message: 'Invalid style value' });
    }
    if (fin_system && !ALLOWED_FIN_SYSTEMS.includes(fin_system as (typeof ALLOWED_FIN_SYSTEMS)[number])) {
      return fail(400, { message: 'Invalid fin system value' });
    }
    if (fin_setup && !ALLOWED_FIN_SETUPS.includes(fin_setup as (typeof ALLOWED_FIN_SETUPS)[number])) {
      return fail(400, { message: 'Invalid fin setup value' });
    }

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
    const rawImageUrls = form.getAll('image_urls');
    if (rawImageUrls.length > 0 && data?.id) {
      const cleanedUrls = validateImageUrls(rawImageUrls);
      if (cleanedUrls.length > 0) {
        const imageInserts = cleanedUrls.map((image_url, index) => ({
          surfboard_id: data.id,
          image_url,
          position: index
        }));

        const { error: imgError } = await locals.supabase
          .from('surfboard_images')
          .insert(imageInserts);

        if (imgError) {
          return fail(500, { message: `Failed to save images: ${imgError.message}` });
        }
      }
    }

    throw redirect(303, '/my-boards');
  }
};
