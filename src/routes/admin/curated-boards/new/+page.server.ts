// src/routes/admin/curated-boards/new/+page.server.ts
import { fail, redirect, type Actions } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const form = await request.formData();
    
    // Required fields
    const name = form.get('name')?.toString() ?? '';
    const make = form.get('make')?.toString() ?? '';
    const length = form.get('length') ? Number(form.get('length')) : null;
    const condition = form.get('condition')?.toString() ?? '';
    const style = form.get('style')?.toString() ?? '';
    const price = form.get('price') ? Number(form.get('price')) : null;
    const city = form.get('city')?.toString() ?? '';
    const region = form.get('region')?.toString() ?? '';
    const source_type = form.get('source_type')?.toString() ?? '';
    const source_url = form.get('source_url')?.toString() ?? '';

    // Validation
    if (!name || !make || !length || !condition || !style || !price || !city || !region || !source_type || !source_url) {
      return fail(400, { message: 'All required fields must be filled' });
    }

    // Optional fields
    const width = form.get('width') ? Number(form.get('width')) : null;
    const thickness = form.get('thickness') ? Number(form.get('thickness')) : null;
    const volume = form.get('volume') ? Number(form.get('volume')) : null;
    const fin_system = form.get('fin_system')?.toString() || null;
    const fin_setup = form.get('fin_setup')?.toString() || null;
    const notes = form.get('notes')?.toString() || null;
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
          city,
          region,
          lat,
          lon,
          source_type,
          source_url,
          user_id: user.id,
          is_curated: true,
          state: 'active',
          is_deleted: false
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Insert error:', error.message);
      return fail(500, { message: 'Failed to save curated board' });
    }

    throw redirect(303, '/admin/curated-boards');
  }
};

