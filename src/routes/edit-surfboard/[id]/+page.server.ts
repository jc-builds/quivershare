// src/routes/edit-surfboard/[id]/+page.server.ts
import { redirect, error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  validateImageUrls,
  MAX_IMAGES_PER_LISTING
} from '$lib/server/imageValidation';
import { requireLocation, LocationValidationError } from '$lib/server/location';

const ALLOWED_STYLES = ['Shortboard', 'Mid-length', 'Longboard', 'Groveler / Fish', 'Gun', 'Groveler'] as const;
const ALLOWED_FIN_SYSTEMS = ['FCS', 'FCS II', 'Futures', 'Glass On', 'Single Fin Box'] as const;
const ALLOWED_FIN_SETUPS = ['Single', '2+1', 'Twin', 'Twin + Trailer', 'Twinzer', 'Tri', 'Quad', 'Tri/Quad', 'Bonzer', '4+1'] as const;

export const load: PageServerLoad = async ({ locals, params }) => {
  // Must be logged in
  if (!locals.user) throw redirect(303, '/login');
  const uid = locals.user.id;

  const id = params.id;

  // Fetch the board for THIS user (exclude deleted)
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
      state,
      user_id
    `)
    .eq('id', id)
    .eq('user_id', uid)
    .eq('owner_type', 'individual')
    .eq('is_deleted', false)
    .single();

  if (boardErr || !surfboard) {
    throw error(404, 'Surfboard not found');
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

  return {
    surfboard,
    existingImages: images ?? []
  };
};

export const actions: Actions = {
  updateBoard: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard belongs to the user and is an individual board
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .eq('owner_type', 'individual')
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Surfboard not found or access denied' });
    }

    const form = await request.formData();
    
    // Extract and validate fields (same pattern as create-surfboard)
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
      if (e instanceof LocationValidationError) {
        return fail(400, { message: e.message });
      }
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

    // Convert numeric fields
    const updateData: any = {
      name,
      make: make === '' ? null : make,
      length: length === '' || !length ? null : Number(length),
      width: width === '' || !width ? null : Number(width),
      thickness: thickness === '' || !thickness ? null : Number(thickness),
      volume: volume === '' || !volume ? null : Number(volume),
      fin_system: fin_system === '' ? null : fin_system,
      fin_setup: fin_setup === '' ? null : fin_setup,
      style: style === '' ? null : style,
      price: price === '' || !price ? null : Math.round(Number(price)),
      condition,
      notes,
      location_label: location.label,
      city: location.city,
      region: location.region,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
    };

    // Include state if provided (for consistency with existing data structure)
    if (state === 'active' || state === 'inactive') {
      updateData.state = state;
    }

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update(updateData)
      .eq('id', surfboardId);

    if (updateError) {
      console.error('Board update error:', updateError.message);
      return fail(500, { message: `Failed to update surfboard: ${updateError.message}` });
    }

    return { success: true };
  },
  reorderImages: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
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

    // Verify the surfboard belongs to the user and is an individual board
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .eq('owner_type', 'individual')
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Surfboard not found or access denied' });
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
        console.error('[reorderImages] Position update failed:', updateError.message);
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
        console.error('[reorderImages] Position update failed:', updateError.message);
        return fail(500, { message: 'Failed to reorder images' });
      }
    }

    return { success: true };
  },
  deleteImage: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard belongs to the user and is an individual board
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .eq('owner_type', 'individual')
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Surfboard not found or access denied' });
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

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard belongs to the user and is an individual board
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .eq('owner_type', 'individual')
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Surfboard not found or access denied' });
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

  deleteBoard: async ({ locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { message: 'Unauthorized' });
    }

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard belongs to the user and is an individual board
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .eq('owner_type', 'individual')
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { message: 'Surfboard not found or access denied' });
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

    throw redirect(303, '/my-boards');
  }
};
