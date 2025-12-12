// src/routes/admin/curated-boards/[id]/+page.server.ts
import { redirect, error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabaseAdmin } from '$lib/server/supabaseAdmin';

export const load: PageServerLoad = async ({ locals, params }) => {
  // Must be logged in (admin check is in parent layout)
  if (!locals.user) throw redirect(303, '/login');

  const id = params.id;

  // Fetch the curated board (admin can edit any curated board)
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
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
    .order('id', { ascending: true });

  if (imgErr) {
    console.warn('Image fetch error:', imgErr.message);
  }

  return {
    surfboard,
    existingImages: images ?? []
  };
};

export const actions: Actions = {
  uploadImages: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

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
    const imageUrls = form.getAll('image_urls') as string[];

    if (imageUrls.length === 0) {
      return fail(400, { message: 'No image URLs provided' });
    }

    const imageInserts = imageUrls
      .filter(url => url && url.trim() !== '')
      .map(image_url => ({
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
  updateThumbnail: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) return fail(401, { message: 'Unauthorized' });

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
    const price = form.get('price')?.toString() ? Number(form.get('price')) : null;
    const condition = form.get('condition')?.toString() || null;
    const notes = form.get('notes')?.toString() || null;
    const city = form.get('city')?.toString() || null;
    const region = form.get('region')?.toString() || null;
    const lat_raw = form.get('lat')?.toString();
    const lon_raw = form.get('lon')?.toString();
    const lat = lat_raw && lat_raw !== '' ? Number(lat_raw) : null;
    const lon = lon_raw && lon_raw !== '' ? Number(lon_raw) : null;
    const source_type = form.get('source_type')?.toString() || null;
    const source_url = form.get('source_url')?.toString() || null;
    const state = form.get('state')?.toString() || 'active';
    
    // Validate state
    if (state !== 'active' && state !== 'inactive') {
      return fail(400, { success: false, message: 'Invalid state value' });
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
      city,
      region,
      lat,
      lon,
      source_type,
      source_url,
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

