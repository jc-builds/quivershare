// src/routes/admin/curated-boards/new/+page.server.ts
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { validateImageUrls } from '$lib/server/imageValidation';

const ALLOWED_STYLES = ['Shortboard', 'Mid-length', 'Longboard', 'Groveler / Fish', 'Gun', 'Groveler'] as const;
const ALLOWED_FIN_SYSTEMS = ['FCS', 'FCS II', 'Futures', 'Glass On', 'Single Fin Box'] as const;
const ALLOWED_FIN_SETUPS = ['Single', '2+1', 'Twin', 'Twin + Trailer', 'Twinzer', 'Tri', 'Quad', 'Tri/Quad', 'Bonzer', '4+1'] as const;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: shops, error: shopsError } = await locals.supabase
    .from('shops')
    .select('id, name, location_label, city, region, latitude, longitude')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (shopsError) {
    console.error('Failed to load shops:', shopsError.message);
    return { shops: [] };
  }

  return {
    shops: shops ?? []
  };
};

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
    const shop_id_raw = form.get('shop_id')?.toString() ?? '';
    const shop_id = shop_id_raw === '' ? null : shop_id_raw;

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
    const values = {
      name,
      make,
      length: form.get('length')?.toString() ?? '',
      width: form.get('width')?.toString() ?? '',
      thickness: form.get('thickness')?.toString() ?? '',
      volume: form.get('volume')?.toString() ?? '',
      fin_system: fin_system ?? '',
      fin_setup: fin_setup ?? '',
      style,
      price: form.get('price')?.toString() ?? '',
      condition,
      city,
      region,
      source_type,
      source_url,
      shop_id: shop_id ?? '',
      notes: notes ?? '',
      lat: lat_raw ?? '',
      lon: lon_raw ?? ''
    };

    // Validation
    if (!name || !make || !length || !condition || !style || !price || !city || !region || !source_type || !source_url) {
      return fail(400, { message: 'All required fields must be filled', values });
    }

    if (style && !ALLOWED_STYLES.includes(style as (typeof ALLOWED_STYLES)[number])) {
      return fail(400, { message: 'Invalid style value', values });
    }
    if (fin_system && !ALLOWED_FIN_SYSTEMS.includes(fin_system as (typeof ALLOWED_FIN_SYSTEMS)[number])) {
      return fail(400, { message: 'Invalid fin system value', values });
    }
    if (fin_setup && !ALLOWED_FIN_SETUPS.includes(fin_setup as (typeof ALLOWED_FIN_SETUPS)[number])) {
      return fail(400, { message: 'Invalid fin setup value', values });
    }

    let persistedShopId: string | null = null;
    if (source_type === 'shop') {
      if (!shop_id) {
        return fail(400, { message: 'Shop is required for shop listings', values });
      }

      const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id')
        .eq('id', shop_id)
        .eq('is_active', true)
        .maybeSingle();

      if (shopError || !shop) {
        return fail(400, { message: 'Selected shop is invalid or inactive', values });
      }

      persistedShopId = shop.id;
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
          source_type,
          source_url,
          shop_id: source_type === 'shop' ? persistedShopId : null,
          user_id: user.id,
          owner_type: 'curated',
          is_curated: true,
          state: 'active',
          is_deleted: false
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Curated board insert error:', error.message, error.details, error.hint);
      return fail(500, { message: `Failed to save curated board: ${error.message}`, values });
    }

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
          console.error('Image insert error:', imgError.message);
          return fail(500, { message: `Board created but failed to save images: ${imgError.message}`, values });
        }
      }
    }

    throw redirect(303, '/admin/curated-boards');
  }
};

