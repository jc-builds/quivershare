import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
  validateImageUrls,
  MAX_IMAGES_PER_LISTING
} from '$lib/server/imageValidation';
import { requireLocation, LocationValidationError } from '$lib/server/location';

const ALLOWED_STYLES = ['Shortboard', 'Mid-length', 'Longboard', 'Groveler / Fish', 'Gun', 'Groveler'] as const;
const ALLOWED_FIN_SYSTEMS = ['FCS', 'FCS II', 'Futures', 'Glass On', 'Single Fin Box'] as const;
const ALLOWED_FIN_SETUPS = ['Single', '2+1', 'Twin', 'Twin + Trailer', 'Twinzer', 'Tri', 'Quad', 'Tri/Quad', 'Bonzer', '4+1'] as const;

async function resolveShopAndAuthorize(locals: App.Locals, slug: string, redirectPath: string) {
  const user = locals.user;
  if (!user) throw redirect(303, `/login?redirectTo=${redirectPath}`);

  const { data: shop, error: shopErr } = await locals.supabase
    .from('shops')
    .select('id, name, slug, owner_user_id')
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

  return { user, shop };
}

async function verifyBoardBelongsToShop(locals: App.Locals, boardId: string, shopId: string) {
  const { data: board, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('id')
    .eq('id', boardId)
    .eq('shop_id', shopId)
    .eq('owner_type', 'shop')
    .eq('is_deleted', false)
    .single();

  if (boardErr || !board) return null;
  return board;
}

export const load: PageServerLoad = async ({ locals, params }) => {
  const { shop } = await resolveShopAndAuthorize(
    locals, params.slug, `/shops/${params.slug}/dashboard/${params.id}/edit`
  );

  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select(`
      id, name, make, length, width, thickness, volume,
      fin_system, fin_setup, style, price, condition, notes,
      location_label, city, region, country, lat, lon, state
    `)
    .eq('id', params.id)
    .eq('shop_id', shop.id)
    .eq('owner_type', 'shop')
    .eq('is_deleted', false)
    .single();

  if (boardErr || !surfboard) {
    throw error(404, 'Board not found');
  }

  const { data: images, error: imgErr } = await locals.supabase
    .from('surfboard_images')
    .select('id, image_url')
    .eq('surfboard_id', params.id)
    .order('position', { ascending: true });

  if (imgErr) console.warn('Image fetch error:', imgErr.message);

  return { shop, surfboard, existingImages: images ?? [] };
};

export const actions: Actions = {
  updateBoard: async ({ request, locals, params }) => {
    const { shop } = await resolveShopAndAuthorize(
      locals, params.slug, `/shops/${params.slug}/dashboard/${params.id}/edit`
    );

    const boardId = params.id;
    const board = await verifyBoardBelongsToShop(locals, boardId, shop.id);
    if (!board) return fail(404, { message: 'Board not found or access denied' });

    const form = await request.formData();

    const name = form.get('name')?.toString() ?? '';
    const make = form.get('make')?.toString() || null;
    const length = form.get('length')?.toString();
    const width = form.get('width')?.toString();
    const thickness = form.get('thickness')?.toString();
    const volume = form.get('volume')?.toString();
    const fin_system = form.get('fin_system')?.toString() || null;
    const fin_setup = form.get('fin_setup')?.toString() || null;
    const style = form.get('style')?.toString() || null;
    const price = form.get('price')?.toString();
    const condition = form.get('condition')?.toString() ?? '';
    const notes = form.get('notes')?.toString() ?? '';
    const state = form.get('state')?.toString();

    let location;
    try {
      location = requireLocation(form);
    } catch (e) {
      if (e instanceof LocationValidationError) return fail(400, { message: e.message });
      throw e;
    }

    if (style && !ALLOWED_STYLES.includes(style as (typeof ALLOWED_STYLES)[number])) {
      return fail(400, { message: 'Invalid style value' });
    }
    if (fin_system && !ALLOWED_FIN_SYSTEMS.includes(fin_system as (typeof ALLOWED_FIN_SYSTEMS)[number])) {
      return fail(400, { message: 'Invalid fin system value' });
    }
    if (fin_setup && !ALLOWED_FIN_SETUPS.includes(fin_setup as (typeof ALLOWED_FIN_SETUPS)[number])) {
      return fail(400, { message: 'Invalid fin setup value' });
    }

    const updateData: Record<string, unknown> = {
      name,
      make: make === '' ? null : make,
      length: length === '' || !length ? null : Number(length),
      width: width === '' || !width ? null : Number(width),
      thickness: thickness === '' || !thickness ? null : Number(thickness),
      volume: volume === '' || !volume ? null : Number(volume),
      fin_system: fin_system === '' ? null : fin_system,
      fin_setup: fin_setup === '' ? null : fin_setup,
      style: style === '' ? null : style,
      price: price === '' || !price ? null : Number(price),
      condition, notes,
      location_label: location.label,
      city: location.city,
      region: location.region,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
    };

    if (state === 'active' || state === 'inactive') updateData.state = state;

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update(updateData)
      .eq('id', boardId);

    if (updateError) {
      console.error('Board update error:', updateError.message);
      return fail(500, { message: `Failed to update board: ${updateError.message}` });
    }

    return { success: true };
  },

  addImages: async ({ request, locals, params }) => {
    const { shop } = await resolveShopAndAuthorize(
      locals, params.slug, `/shops/${params.slug}/dashboard/${params.id}/edit`
    );

    const boardId = params.id;
    const board = await verifyBoardBelongsToShop(locals, boardId, shop.id);
    if (!board) return fail(404, { message: 'Board not found or access denied' });

    const form = await request.formData();
    const rawImageUrls = form.getAll('image_urls');
    const cleanedUrls = validateImageUrls(rawImageUrls);

    if (cleanedUrls.length === 0) return fail(400, { message: 'No image URLs provided' });

    const { count: existingCount } = await locals.supabase
      .from('surfboard_images')
      .select('*', { count: 'exact', head: true })
      .eq('surfboard_id', boardId);

    if ((existingCount ?? 0) + cleanedUrls.length > MAX_IMAGES_PER_LISTING) {
      return fail(400, { message: 'Maximum 6 images allowed.' });
    }

    const { data: existingImages } = await locals.supabase
      .from('surfboard_images')
      .select('position')
      .eq('surfboard_id', boardId)
      .order('position', { ascending: false })
      .limit(1);

    const currentMax = existingImages?.[0]?.position ?? -1;

    const imageInserts = cleanedUrls.map((image_url, index) => ({
      surfboard_id: boardId,
      image_url,
      position: currentMax + 1 + index
    }));

    const { data: insertedImages, error: imgError } = await locals.supabase
      .from('surfboard_images')
      .insert(imageInserts)
      .select('id, image_url, position');

    if (imgError) return fail(500, { message: 'Failed to save images' });

    return { success: true, images: insertedImages ?? [] };
  },

  reorderImages: async ({ request, locals, params }) => {
    const { shop } = await resolveShopAndAuthorize(
      locals, params.slug, `/shops/${params.slug}/dashboard/${params.id}/edit`
    );

    const boardId = params.id;
    const board = await verifyBoardBelongsToShop(locals, boardId, shop.id);
    if (!board) return fail(404, { message: 'Board not found or access denied' });

    const formData = await request.formData();
    const imageIds = formData.getAll('image_ids') as string[];
    if (imageIds.length === 0) return fail(400, { message: 'No image IDs provided' });

    const uniqueIds = new Set(imageIds);
    if (uniqueIds.size !== imageIds.length) return fail(400, { message: 'Duplicate image IDs' });

    const { data: surfboardImages, error: imagesError } = await locals.supabase
      .from('surfboard_images')
      .select('id')
      .eq('surfboard_id', boardId);

    if (imagesError || !surfboardImages) return fail(500, { message: 'Failed to load images' });

    const validIds = new Set(surfboardImages.map((img) => img.id));
    for (const id of imageIds) {
      if (!validIds.has(id)) return fail(400, { message: 'Invalid image ID for this board' });
    }
    if (imageIds.length !== surfboardImages.length) return fail(400, { message: 'Image ID count mismatch' });

    for (let i = 0; i < imageIds.length; i++) {
      const { error: err } = await locals.supabase
        .from('surfboard_images')
        .update({ position: 1000 + i })
        .eq('id', imageIds[i])
        .eq('surfboard_id', boardId);
      if (err) return fail(500, { message: 'Failed to reorder images' });
    }

    for (let i = 0; i < imageIds.length; i++) {
      const { error: err } = await locals.supabase
        .from('surfboard_images')
        .update({ position: i })
        .eq('id', imageIds[i])
        .eq('surfboard_id', boardId);
      if (err) return fail(500, { message: 'Failed to reorder images' });
    }

    return { success: true };
  },

  deleteImage: async ({ request, locals, params }) => {
    const { shop } = await resolveShopAndAuthorize(
      locals, params.slug, `/shops/${params.slug}/dashboard/${params.id}/edit`
    );

    const boardId = params.id;
    const board = await verifyBoardBelongsToShop(locals, boardId, shop.id);
    if (!board) return fail(404, { message: 'Board not found or access denied' });

    const form = await request.formData();
    const imageId = form.get('image_id')?.toString();
    const imageUrl = form.get('image_url')?.toString();

    if (!imageId) return fail(400, { message: 'Missing image ID' });

    const { data: image, error: imageError } = await locals.supabase
      .from('surfboard_images')
      .select('id, surfboard_id')
      .eq('id', imageId)
      .eq('surfboard_id', boardId)
      .single();

    if (imageError || !image) return fail(404, { message: 'Image not found' });

    const { error: deleteError } = await locals.supabase
      .from('surfboard_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) return fail(500, { message: 'Failed to delete image' });

    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        const bucketIdx = parts.findIndex((p) => p === 'surfboard-images');
        if (bucketIdx !== -1) {
          const storagePath = parts.slice(bucketIdx + 1).join('/');
          await locals.supabase.storage.from('surfboard-images').remove([storagePath]);
        }
      } catch (e) {
        console.error('Error deleting from storage:', e);
      }
    }

    return { success: true };
  }
};
