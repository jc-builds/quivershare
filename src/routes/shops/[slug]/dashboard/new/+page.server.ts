import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { validateImageUrls } from '$lib/server/imageValidation';
import { requireLocation, LocationValidationError } from '$lib/server/location';

const ALLOWED_STYLES = ['Shortboard', 'Mid-length', 'Longboard', 'Groveler / Fish', 'Gun', 'Groveler'] as const;
const ALLOWED_FIN_SYSTEMS = ['FCS', 'FCS II', 'Futures', 'Glass On', 'Single Fin Box'] as const;
const ALLOWED_FIN_SETUPS = ['Single', '2+1', 'Twin', 'Twin + Trailer', 'Twinzer', 'Tri', 'Quad', 'Tri/Quad', 'Bonzer', '4+1'] as const;

async function resolveShopAndAuthorize(locals: App.Locals, slug: string) {
  const user = locals.user;
  if (!user) throw redirect(303, `/login?redirectTo=/shops/${slug}/dashboard/new`);

  const { data: shop, error: shopErr } = await locals.supabase
    .from('shops')
    .select('id, name, slug, owner_user_id, is_active, location_label, city, region, country, latitude, longitude')
    .eq('slug', slug)
    .maybeSingle();

  if (shopErr || !shop) throw error(404, 'Shop not found');

  if (shop.owner_user_id !== user.id) {
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      throw error(403, 'You do not have permission to manage this shop');
    }
  }

  if (!shop.is_active) {
    throw error(403, 'This shop is inactive and cannot accept new listings');
  }

  return { user, shop };
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const load: PageServerLoad = async ({ locals, params }) => {
  const { shop } = await resolveShopAndAuthorize(locals, params.slug);
  return {
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      location_label: shop.location_label,
      city: shop.city,
      region: shop.region,
      country: shop.country,
      latitude: shop.latitude,
      longitude: shop.longitude,
    }
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const { shop } = await resolveShopAndAuthorize(locals, params.slug);

    const form = await request.formData();

    const name = form.get('name')?.toString()?.trim() ?? '';
    const make = form.get('make')?.toString()?.trim() ?? '';
    const length = form.get('length') ? Number(form.get('length')) : null;
    const width = form.get('width') ? Number(form.get('width')) : null;
    const thickness = form.get('thickness') ? Number(form.get('thickness')) : null;
    const volume = form.get('volume') ? Number(form.get('volume')) : null;
    const fin_system = form.get('fin_system')?.toString() || null;
    const fin_setup = form.get('fin_setup')?.toString() || null;
    const style = form.get('style')?.toString() || null;
    const price = form.get('price') ? Math.round(Number(form.get('price'))) : null;
    const condition = form.get('condition')?.toString()?.trim() ?? '';
    const notes = form.get('notes')?.toString()?.trim() || null;
    const rawSourceUrl = form.get('source_url')?.toString()?.trim() || null;

    const values = {
      name, make,
      length: form.get('length')?.toString() ?? '',
      width: form.get('width')?.toString() ?? '',
      thickness: form.get('thickness')?.toString() ?? '',
      volume: form.get('volume')?.toString() ?? '',
      fin_system: fin_system ?? '', fin_setup: fin_setup ?? '',
      style: style ?? '',
      price: form.get('price')?.toString() ?? '',
      condition, notes: notes ?? '',
    };

    if (!name) return fail(400, { message: 'Board name is required', values });
    if (!make) return fail(400, { message: 'Make / Brand is required', values });
    if (!length) return fail(400, { message: 'Length is required', values });
    if (!style) return fail(400, { message: 'Board style is required', values });
    if (!price || price <= 0) return fail(400, { message: 'Price is required', values });
    if (!condition) return fail(400, { message: 'Condition is required', values });

    if (rawSourceUrl && !isValidUrl(rawSourceUrl)) {
      return fail(400, { message: 'Landing Page URL must be a valid URL (e.g. https://example.com)', values });
    }

    const source_url = rawSourceUrl || null;
    const source_type = source_url ? 'shop' : null;

    let location;
    try {
      location = requireLocation(form);
    } catch (e) {
      if (e instanceof LocationValidationError) {
        return fail(400, { message: e.message, values });
      }
      throw e;
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

    const { data, error: insertErr } = await locals.supabase
      .from('surfboards')
      .insert([{
        name, make, length, width, thickness, volume,
        fin_system, fin_setup, style, price, condition, notes,
        location_label: location.label,
        city: location.city,
        region: location.region,
        country: location.country,
        lat: location.lat,
        lon: location.lon,
        owner_type: 'shop',
        shop_id: shop.id,
        source_url,
        source_type,
        is_curated: false,
        state: 'active',
        is_deleted: false
      }])
      .select('id')
      .single();

    if (insertErr) {
      console.error('Shop board insert error:', insertErr.message);
      return fail(500, { message: `Failed to save board: ${insertErr.message}`, values });
    }

    if (!data?.id) {
      return fail(500, { message: 'Failed to save board: no ID returned', values });
    }

    const rawImageUrls = form.getAll('image_urls');
    if (rawImageUrls.length > 0) {
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

    throw redirect(303, `/shops/${shop.slug}/dashboard`);
  }
};
