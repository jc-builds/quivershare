// src/routes/edit-surfboard/[id]/+page.server.ts
import { redirect, error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
  validateImageUrls,
  MAX_IMAGES_PER_LISTING
} from '$lib/server/imageValidation';

export const load: PageServerLoad = async ({ locals, params }) => {
  // Must be logged in
  if (!locals.user) throw redirect(303, '/login');
  const uid = locals.user.id;

  const id = params.id;

  // Fetch the board for THIS user (exclude deleted)
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
    .eq('id', id)
    .eq('user_id', uid)
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

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
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
    const city = form.get('city')?.toString() || null;
    const region = form.get('region')?.toString() || null;
    const lat_raw = form.get('lat')?.toString();
    const lon_raw = form.get('lon')?.toString();
    const state = form.get('state')?.toString();

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
      price: price === '' || !price ? null : Number(price),
      condition,
      notes,
      city: city === '' ? null : city,
      region: region === '' ? null : region,
      lat: lat_raw === '' || !lat_raw ? null : Number(lat_raw),
      lon: lon_raw === '' || !lon_raw ? null : Number(lon_raw),
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
  uploadImages: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Surfboard not found or access denied' });
    }

    const form = await request.formData();
    const rawImageUrls = form.getAll('image_urls');
    const cleanedUrls = validateImageUrls(rawImageUrls);

    if (cleanedUrls.length === 0) {
      return fail(400, { message: 'No image URLs provided' });
    }

    // Enforce total images per listing (existing + new)
    const { count: existingCount } = await locals.supabase
      .from('surfboard_images')
      .select('*', { count: 'exact', head: true })
      .eq('surfboard_id', surfboardId);

    if ((existingCount ?? 0) + cleanedUrls.length > MAX_IMAGES_PER_LISTING) {
      return fail(400, { message: 'Maximum 6 images allowed.' });
    }

    const imageInserts = cleanedUrls.map(image_url => ({
      surfboard_id: surfboardId,
      image_url
    }));

    const { error: imgError } = await locals.supabase
      .from('surfboard_images')
      .insert(imageInserts);

    if (imgError) {
      console.error('Image insert error:', imgError.message);
      return fail(500, { message: 'Failed to save images' });
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

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
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
  updateThumbnail: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

    const surfboardId = params.id;
    if (!surfboardId) {
      return fail(400, { message: 'Missing surfboard ID' });
    }

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
      .single();

    if (boardError || !board) {
      return fail(403, { message: 'Surfboard not found or access denied' });
    }

    const form = await request.formData();
    const thumbnail_url = form.get('thumbnail_url')?.toString();

    if (!thumbnail_url) {
      return fail(400, { message: 'Missing thumbnail URL' });
    }

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update({ thumbnail_url })
      .eq('id', surfboardId);

    if (updateError) {
      console.error('Thumbnail update error:', updateError.message);
      return fail(500, { message: 'Failed to update thumbnail' });
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

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
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

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', surfboardId)
      .eq('user_id', user.id)
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

    // Verify the surfboard belongs to the user
    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id, user_id')
      .eq('id', surfboardId)
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { message: 'Surfboard not found' });
    }

    if (board.user_id !== user.id) {
      return fail(403, { message: 'Access denied' });
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
