// src/routes/admin/curated-boards/[id]/+page.server.ts
import { redirect, error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';
import {
  validateImageUrls,
  MAX_IMAGES_PER_LISTING
} from '$lib/server/imageValidation';
import { requireLocation, LocationValidationError } from '$lib/server/location';

const ALLOWED_STYLES = ['Shortboard', 'Mid-length', 'Longboard', 'Groveler / Fish', 'Gun', 'Groveler'] as const;
const ALLOWED_FIN_SYSTEMS = ['FCS', 'FCS II', 'Futures', 'Glass On', 'Single Fin Box'] as const;
const ALLOWED_FIN_SETUPS = ['Single', '2+1', 'Twin', 'Twin + Trailer', 'Twinzer', 'Tri', 'Quad', 'Tri/Quad', 'Bonzer', '4+1'] as const;
const ALLOWED_SOURCE_TYPES = ['facebook', 'shop', 'other'] as const;

export const load: PageServerLoad = async ({ locals, params }) => {
  // Must be logged in (admin check is in parent layout)
  if (!locals.user) throw redirect(303, '/login');

  const id = params.id;

  // Fetch the curated board (admin can edit any curated board)
    const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select(`
      id,
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
      location_label,
      city,
      region,
      country,
      lat,
      lon,
      source_type,
      source_url,
      shop_id,
      state,
      is_curated,
      is_deleted
    `)
    .eq('id', id)
    .eq('is_curated', true)
    .eq('is_deleted', false)
    .single();

  if (boardErr || !surfboard) {
    throw error(404, 'Curated surfboard not found');
  }

  // Fetch images
  const { data: images, error: imgErr } = await locals.supabase
    .from('surfboard_images')
    .select('id,image_url')
    .eq('surfboard_id', id)
    .order('position', { ascending: true });

  if (imgErr) {
    console.warn('Image fetch error:', imgErr.message);
  }

  const { data: activeShops, error: shopsError } = await locals.supabase
    .from('shops')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (shopsError) {
    console.warn('Shops fetch error:', shopsError.message);
  }

  let shops = activeShops ?? [];
  if (surfboard.shop_id && !shops.some((shop) => shop.id === surfboard.shop_id)) {
    const { data: currentShop, error: currentShopError } = await locals.supabase
      .from('shops')
      .select('id, name')
      .eq('id', surfboard.shop_id)
      .maybeSingle();

    if (!currentShopError && currentShop) {
      shops = [currentShop, ...shops];
    }
  }

  return {
    surfboard,
    existingImages: images ?? [],
    shops
  };
};

export const actions: Actions = {
  reorderImages: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }

    // Verify admin status
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_admin !== true) {
      return fail(403, { message: 'Access denied: Not an admin' });
    }

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard is curated and not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('is_curated', true)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Curated surfboard not found or access denied' });
    }

    const formData = await request.formData();
    const imageIds = formData.getAll('image_ids') as string[];

    if (imageIds.length === 0) {
      return fail(400, { message: 'No image IDs provided' });
    }

    const uniqueImageIds = new Set(imageIds);
    if (uniqueImageIds.size !== imageIds.length) {
      return fail(400, { message: 'Duplicate image IDs are not allowed' });
    }

    // Fetch all images that belong to this surfboard
    const { data: surfboardImages, error: imagesError } = await locals.supabase
      .from('surfboard_images')
      .select('id')
      .eq('surfboard_id', surfboardId);

    if (imagesError || !surfboardImages) {
      return fail(500, { message: 'Failed to load surfboard images' });
    }

    const surfboardImageIds = new Set(surfboardImages.map((img) => img.id));

    // Validate every incoming ID belongs to this surfboard
    for (const imageId of imageIds) {
      if (!surfboardImageIds.has(imageId)) {
        return fail(400, { message: 'One or more image IDs are invalid for this surfboard' });
      }
    }

    // Validate counts match (client must provide complete ordered set)
    if (imageIds.length !== surfboardImages.length) {
      return fail(400, { message: 'Image ID count mismatch' });
    }

    // Phase 1: move to temporary non-conflicting positions
    for (let i = 0; i < imageIds.length; i++) {
      const tempPosition = 1000 + i;
      const { error: updateError } = await locals.supabase
        .from('surfboard_images')
        .update({ position: tempPosition })
        .eq('id', imageIds[i])
        .eq('surfboard_id', surfboardId);

      if (updateError) {
        console.error('Position update failed:', updateError.message);
        return fail(500, { message: 'Failed to reorder images' });
      }
    }

    // Phase 2: assign final positions sequentially so position 0 is thumbnail
    for (let i = 0; i < imageIds.length; i++) {
      const { error: updateError } = await locals.supabase
        .from('surfboard_images')
        .update({ position: i })
        .eq('id', imageIds[i])
        .eq('surfboard_id', surfboardId);

      if (updateError) {
        console.error('Position update failed:', updateError.message);
        return fail(500, { message: 'Failed to reorder images' });
      }
    }

    return { success: true };
  },
  deleteImage: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_admin !== true) {
      return fail(403, { message: 'Access denied: Not an admin' });
    }

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard is curated
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('is_curated', true)
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Curated surfboard not found or access denied' });
    }

    const form = await request.formData();
    const imageId = form.get('image_id')?.toString();
    const imageUrl = form.get('image_url')?.toString();

    if (!imageId) {
      return fail(400, { message: 'Missing image ID' });
    }

    // Verify the image belongs to this surfboard
    const { data: image, error: imageError } = await locals.supabase
      .from('surfboard_images')
      .select('id, surfboard_id')
      .eq('id', imageId)
      .eq('surfboard_id', surfboardId)
      .single();

    if (imageError || !image) {
      return fail(404, { message: 'Image not found' });
    }

    // Delete from database
    const { error: deleteError } = await locals.supabase
      .from('surfboard_images')
      .delete()
      .eq('id', imageId);

    if (deleteError) {
      console.error('Image delete error:', deleteError.message);
      return fail(500, { message: 'Failed to delete image from database' });
    }

    // Also delete from storage if URL provided
    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        const parts = url.pathname.split('/').filter(Boolean);
        const bucketIdx = parts.findIndex((p) => p === 'surfboard-images');
        if (bucketIdx !== -1) {
          const storagePath = parts.slice(bucketIdx + 1).join('/');
          const { error: storageError } = await locals.supabase.storage
            .from('surfboard-images')
            .remove([storagePath]);

          if (storageError) {
            console.error('Storage delete error:', storageError.message);
            // Don't fail the request if storage delete fails - DB delete already succeeded
          }
        }
      } catch (e) {
        console.error('Error parsing image URL for storage deletion:', e);
        // Don't fail the request
      }
    }

    return { success: true };
  },
  updateState: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_admin !== true) {
      return fail(403, { message: 'Access denied: Not an admin' });
    }

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard is curated
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('is_curated', true)
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Curated surfboard not found or access denied' });
    }

    const form = await request.formData();
    const newState = form.get('state')?.toString();

    if (newState !== 'active' && newState !== 'inactive') {
      return fail(400, { message: 'Invalid state value' });
    }

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update({ state: newState })
      .eq('id', surfboardId);

    if (updateError) {
      console.error('State update error:', updateError.message);
      return fail(500, { message: 'Failed to update state' });
    }

    return { success: true, state: newState };
  },

  updateBoard: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { success: false, message: 'Unauthorized' });
    }

    // Verify admin status
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_admin !== true) {
      return fail(403, { success: false, message: 'Admin access required' });
    }

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { success: false, message: 'Missing surfboard ID' });
    }

    // Verify the surfboard is curated and not deleted
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id, is_curated, is_deleted')
      .eq('id', surfboardId)
      .eq('is_curated', true)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { success: false, message: 'Curated surfboard not found' });
    }

    // Parse form data
    const form = await request.formData();
    
    // Required fields
    const name = form.get('name')?.toString() ?? '';
    if (!name) {
      return fail(400, { success: false, message: 'Name is required' });
    }

    // Optional fields with type conversion
    const make = form.get('make')?.toString() || null;
    const length = form.get('length')?.toString() ? Number(form.get('length')) : null;
    const width = form.get('width')?.toString() ? Number(form.get('width')) : null;
    const thickness = form.get('thickness')?.toString() ? Number(form.get('thickness')) : null;
    const volume = form.get('volume')?.toString() ? Number(form.get('volume')) : null;
    const fin_system = form.get('fin_system')?.toString() || null;
    const fin_setup = form.get('fin_setup')?.toString() || null;
    const style = form.get('style')?.toString() || null;
    const price = form.get('price')?.toString() ? Math.round(Number(form.get('price'))) : null;
    const condition = form.get('condition')?.toString() || null;
    const notes = form.get('notes')?.toString() || null;
    const state = form.get('state')?.toString() || 'active';

    let location;
    try {
      location = requireLocation(form);
    } catch (e) {
      if (e instanceof LocationValidationError) {
        return fail(400, { success: false, message: e.message });
      }
      throw e;
    }
    
    // Validate state
    if (state !== 'active' && state !== 'inactive') {
      return fail(400, { success: false, message: 'Invalid state value' });
    }
    if (style && !ALLOWED_STYLES.includes(style as (typeof ALLOWED_STYLES)[number])) {
      return fail(400, { success: false, message: 'Invalid style value' });
    }
    if (fin_system && !ALLOWED_FIN_SYSTEMS.includes(fin_system as (typeof ALLOWED_FIN_SYSTEMS)[number])) {
      return fail(400, { success: false, message: 'Invalid fin system value' });
    }
    if (fin_setup && !ALLOWED_FIN_SETUPS.includes(fin_setup as (typeof ALLOWED_FIN_SETUPS)[number])) {
      return fail(400, { success: false, message: 'Invalid fin setup value' });
    }

    // Source fields – now editable from the form
    const source_type = form.get('source_type')?.toString() || null;
    const source_url = form.get('source_url')?.toString() || null;
    const raw_shop_id = form.get('shop_id')?.toString() || null;

    if (source_type && !ALLOWED_SOURCE_TYPES.includes(source_type as (typeof ALLOWED_SOURCE_TYPES)[number])) {
      return fail(400, { success: false, message: 'Invalid source type value' });
    }

    let shop_id: string | null = null;
    if (source_type === 'shop') {
      if (!raw_shop_id) {
        return fail(400, { success: false, message: 'Shop is required for shop listings' });
      }

      const { data: shop, error: shopError } = await locals.supabase
        .from('shops')
        .select('id')
        .eq('id', raw_shop_id)
        .eq('is_active', true)
        .maybeSingle();

      if (shopError || !shop) {
        return fail(400, { success: false, message: 'Selected shop is invalid or inactive' });
      }

      shop_id = shop.id;
    }

    // Build update payload
    const updatePayload = {
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
      location_label: location.label,
      city: location.city,
      region: location.region,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
      source_type,
      source_url,
      shop_id,
      state,
      is_curated: true // Always keep curated boards as curated
    };

    // Use service role client to bypass RLS
    const { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('surfboards')
      .update(updatePayload)
      .eq('id', surfboardId)
      .select('id, price'); // Request returned rows to detect 0-row updates

    if (updateError) {
      console.error('Board update error:', updateError.message);
      return fail(500, { success: false, message: `Failed to update board: ${updateError.message}` });
    }

    // Check if any rows were actually updated
    if (!updatedRows || updatedRows.length === 0) {
      console.error('Update affected 0 rows - possible RLS/permissions issue');
      return fail(500, { 
        success: false, 
        message: 'Update failed (no rows affected). Check admin permissions / profile is_admin / board ownership.' 
      });
    }

    return { success: true, updatedRows };
  },

  deleteBoard: async ({ locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_admin !== true) {
      return fail(403, { message: 'Access denied: Not an admin' });
    }

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard is curated
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id, is_curated')
      .eq('id', surfboardId)
      .eq('is_curated', true)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { message: 'Curated surfboard not found' });
    }

    // Delete the board (set is_deleted to true)
    const { error: deleteError } = await locals.supabase
      .from('surfboards')
      .update({ is_deleted: true })
      .eq('id', surfboardId);

    if (deleteError) {
      console.error('Board delete error:', deleteError.message);
      return fail(500, { message: 'Failed to delete board' });
    }

    throw redirect(303, '/admin/curated-boards');
  }
};

