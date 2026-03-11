import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login?redirectTo=/shops/new');

  const { data: existingShop } = await locals.supabase
    .from('shops')
    .select('slug')
    .eq('owner_user_id', locals.user.id)
    .maybeSingle();

  if (existingShop) {
    throw redirect(303, `/shops/${existingShop.slug}/edit?notice=already_has_shop`);
  }

  return {};
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const { data: existingShop } = await locals.supabase
      .from('shops')
      .select('slug')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (existingShop) {
      throw redirect(303, `/shops/${existingShop.slug}/edit?notice=already_has_shop`);
    }

    const form = await request.formData();

    const name = form.get('name')?.toString()?.trim() ?? '';
    const description = form.get('description')?.toString()?.trim() || null;
    const website_url = form.get('website_url')?.toString()?.trim() ?? '';
    const email = form.get('email')?.toString()?.trim() ?? '';
    const phone = form.get('phone')?.toString()?.trim() || null;
    const location_label = form.get('location_label')?.toString()?.trim() || null;
    const city = form.get('city')?.toString()?.trim() || null;
    const region = form.get('region')?.toString()?.trim() || null;
    const country = form.get('country')?.toString()?.trim() || null;
    const lat_raw = form.get('lat')?.toString()?.trim();
    const lon_raw = form.get('lon')?.toString()?.trim();
    const latitude = lat_raw && lat_raw !== '' ? Number(lat_raw) : null;
    const longitude = lon_raw && lon_raw !== '' ? Number(lon_raw) : null;

    const logoFile = form.get('logo') as File | null;
    const bannerFile = form.get('banner') as File | null;

    const values = { name, description: description ?? '', website_url, email, phone: phone ?? '', location_label: location_label ?? '' };

    if (!name) {
      return fail(400, { message: 'Shop name is required.', values });
    }
    if (!website_url || !isValidUrl(website_url)) {
      return fail(400, { message: 'A valid website URL is required.', values });
    }
    if (!email || !isValidEmail(email)) {
      return fail(400, { message: 'A valid email address is required.', values });
    }

    // Generate unique slug
    let baseSlug = slugify(name);
    if (!baseSlug) baseSlug = 'shop';

    let slug = baseSlug;
    let suffix = 1;
    while (true) {
      const { data: conflict } = await supabaseAdmin
        .from('shops')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!conflict) break;
      suffix++;
      slug = `${baseSlug}-${suffix}`;
    }

    // Insert the shop first to get its ID for media uploads
    const { data: newShop, error: insertError } = await supabaseAdmin
      .from('shops')
      .insert({
        name,
        slug,
        description,
        website_url,
        email,
        phone,
        location_label,
        city,
        region,
        country,
        latitude,
        longitude,
        owner_user_id: user.id,
        is_active: true
      })
      .select('id, slug')
      .single();

    if (insertError || !newShop) {
      console.error('Shop insert error:', insertError?.message);
      return fail(500, { message: 'Failed to create shop. Please try again.', values });
    }

    // Upload logo and banner in parallel when both are present
    async function uploadMedia(
      file: File | null,
      folder: string,
      prefix: string
    ): Promise<string | null> {
      if (!file || file.size === 0) return null;
      if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
        console.warn(`Invalid ${prefix} file type:`, file.type);
        return null;
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${folder}/${newShop.id}/${prefix}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('shop-media')
        .upload(path, file, { contentType: file.type });
      if (uploadErr) {
        console.error(`${prefix} upload error:`, uploadErr.message);
        return null;
      }
      const { data: publicUrl } = supabaseAdmin.storage
        .from('shop-media')
        .getPublicUrl(path);
      return publicUrl.publicUrl;
    }

    const [logo_image_url, banner_image_url] = await Promise.all([
      uploadMedia(logoFile, 'logos', 'logo'),
      uploadMedia(bannerFile, 'banners', 'banner')
    ]);

    // Update shop with image URLs if any were uploaded
    if (logo_image_url || banner_image_url) {
      const updatePayload: Record<string, string> = {};
      if (logo_image_url) updatePayload.logo_image_url = logo_image_url;
      if (banner_image_url) updatePayload.banner_image_url = banner_image_url;

      const { error: updateErr } = await supabaseAdmin
        .from('shops')
        .update(updatePayload)
        .eq('id', newShop.id);

      if (updateErr) {
        console.error('Shop image URL update error:', updateErr.message);
      }
    }

    throw redirect(303, `/shops/${newShop.slug}`);
  }
};
