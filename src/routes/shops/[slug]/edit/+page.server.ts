import { fail, redirect, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import { parseLocation, LocationValidationError } from '$lib/server/location';

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

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const user = locals.user;
  if (!user) throw redirect(303, `/login?redirectTo=/shops/${params.slug}/edit`);

  const { data: shop, error: shopErr } = await locals.supabase
    .from('shops')
    .select(`
      id,
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
      logo_image_url,
      banner_image_url,
      owner_user_id,
      is_active
    `)
    .eq('slug', params.slug)
    .maybeSingle();

  if (shopErr || !shop) {
    throw error(404, 'Shop not found');
  }

  // Check ownership or admin
  let isAdmin = false;
  if (shop.owner_user_id !== user.id) {
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    isAdmin = profile?.is_admin === true;
    if (!isAdmin) {
      throw error(403, 'You do not have permission to edit this shop');
    }
  }

  const notice = url.searchParams.get('notice');

  return {
    shop,
    notice
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    // Fetch shop and verify access
    const { data: shop, error: shopErr } = await locals.supabase
      .from('shops')
      .select('id, slug, owner_user_id, logo_image_url, banner_image_url')
      .eq('slug', params.slug)
      .maybeSingle();

    if (shopErr || !shop) {
      return fail(404, { message: 'Shop not found' });
    }

    if (shop.owner_user_id !== user.id) {
      const { data: profile } = await locals.supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        return fail(403, { message: 'You do not have permission to edit this shop' });
      }
    }

    const form = await request.formData();

    const name = form.get('name')?.toString()?.trim() ?? '';
    const description = form.get('description')?.toString()?.trim() || null;
    const website_url = form.get('website_url')?.toString()?.trim() ?? '';
    const email = form.get('email')?.toString()?.trim() ?? '';
    const phone = form.get('phone')?.toString()?.trim() || null;
    const logoFile = form.get('logo') as File | null;
    const bannerFile = form.get('banner') as File | null;

    const values = { name, description: description ?? '', website_url, email, phone: phone ?? '', location_label: '' };

    let location;
    try {
      location = parseLocation(form);
    } catch (e) {
      if (e instanceof LocationValidationError) {
        return fail(400, { message: e.message, values });
      }
      throw e;
    }

    if (!name) {
      return fail(400, { message: 'Shop name is required.', values });
    }
    if (!website_url || !isValidUrl(website_url)) {
      return fail(400, { message: 'A valid website URL is required.', values });
    }
    if (!email || !isValidEmail(email)) {
      return fail(400, { message: 'A valid email address is required.', values });
    }

    // Upload logo if provided
    let logo_image_url: string | null | undefined = undefined;
    if (logoFile && logoFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(logoFile.type.toLowerCase())) {
        return fail(400, { message: 'Invalid logo file type. Use JPEG, PNG, or WebP.', values });
      }
      const ext = logoFile.name.split('.').pop() || 'jpg';
      const path = `logos/${shop.id}/logo-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('shop-media')
        .upload(path, logoFile, { contentType: logoFile.type });
      if (uploadErr) {
        console.error('Logo upload error:', uploadErr.message);
        return fail(500, { message: 'Failed to upload logo. Please try again.', values });
      }
      const { data: publicUrl } = supabaseAdmin.storage
        .from('shop-media')
        .getPublicUrl(path);
      logo_image_url = publicUrl.publicUrl;
    }

    // Upload banner if provided
    let banner_image_url: string | null | undefined = undefined;
    if (bannerFile && bannerFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(bannerFile.type.toLowerCase())) {
        return fail(400, { message: 'Invalid banner file type. Use JPEG, PNG, or WebP.', values });
      }
      const ext = bannerFile.name.split('.').pop() || 'jpg';
      const path = `banners/${shop.id}/banner-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('shop-media')
        .upload(path, bannerFile, { contentType: bannerFile.type });
      if (uploadErr) {
        console.error('Banner upload error:', uploadErr.message);
        return fail(500, { message: 'Failed to upload banner. Please try again.', values });
      }
      const { data: publicUrl } = supabaseAdmin.storage
        .from('shop-media')
        .getPublicUrl(path);
      banner_image_url = publicUrl.publicUrl;
    }

    const updatePayload: Record<string, any> = {
      name,
      description,
      website_url,
      email,
      phone,
      location_label: location?.label ?? null,
      city: location?.city ?? null,
      region: location?.region ?? null,
      country: location?.country ?? null,
      latitude: location?.lat ?? null,
      longitude: location?.lon ?? null,
    };

    if (logo_image_url !== undefined) updatePayload.logo_image_url = logo_image_url;
    if (banner_image_url !== undefined) updatePayload.banner_image_url = banner_image_url;

    const { error: updateErr } = await supabaseAdmin
      .from('shops')
      .update(updatePayload)
      .eq('id', shop.id);

    if (updateErr) {
      console.error('Shop update error:', updateErr.message);
      return fail(500, { message: 'Failed to update shop. Please try again.', values });
    }

    throw redirect(303, `/shops/${shop.slug}`);
  }
};
