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

    throw redirect(303, '/my-boards');
  }
};
