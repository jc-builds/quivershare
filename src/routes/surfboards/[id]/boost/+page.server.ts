// src/routes/surfboards/[id]/boost/+page.server.ts
import { error, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export type BoardPageData = {
  board: {
    id: string;
    name: string;
    make: string | null;
    length: number | null;
    width: number | null;
    thickness: number | null;
    volume: number | null;
    fin_system: string | null;
    fin_setup: string | null;
    style: string | null;
    condition: string | null;
    price: number | null;
    city: string | null;
    region: string | null;
    notes: string | null;
    thumbnail_url: string | null;
    user_id: string;
  };
  images: Array<{ id: string; image_url: string }>;
  owner: {
    id: string;
    username: string;
    full_name: string | null;
    profile_picture_url: string | null;
    city: string | null;
    region: string | null;
  } | null;
  canEdit: boolean;
};

export type PageServerData = BoardPageData;

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the board
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
    .eq('id', id)
    .single();

  if (boardErr || !surfboard) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the owner's profile
  const { data: ownerProfile, error: ownerError } = await locals.supabase
    .from('profiles')
    .select('id, username, full_name, profile_picture_url, city, region')
    .eq('id', surfboard.user_id)
    .single();

  if (ownerError) {
    console.warn('Error loading owner profile:', ownerError);
  }

  // Fetch images
  const { data: images, error: imgErr } = await locals.supabase
    .from('surfboard_images')
    .select('id, image_url')
    .eq('surfboard_id', id)
    .order('id', { ascending: true });

  if (imgErr) {
    console.warn('Image fetch error:', imgErr.message);
  }

  // Determine if the current user can edit this board
  const { data: authData, error: userError } = await locals.supabase.auth.getUser();
  if (userError) {
    console.warn('Error fetching current user for board detail:', userError);
  }
  const currentUserId = authData?.user?.id ?? null;
  const canEdit = Boolean(currentUserId && surfboard.user_id === currentUserId);

  // Redirect if user is not the owner
  if (!canEdit) {
    throw redirect(303, `/surfboards/${id}`);
  }

  // Get up to 5 images (thumbnail + up to 4 additional)
  const allImages = [
    ...(surfboard.thumbnail_url ? [{ id: 'thumb', image_url: surfboard.thumbnail_url }] : []),
    ...(images ?? [])
  ].filter((img, index, self) => 
    index === self.findIndex((i) => i.image_url === img.image_url)
  ).slice(0, 5);

  return {
    board: surfboard,
    images: allImages,
    owner: ownerProfile ?? null,
    canEdit
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      throw redirect(303, '/login');
    }

    const form = await request.formData();
    const boardId = form.get('board_id')?.toString();
    
    // Verify board belongs to user
    if (boardId !== params.id) {
      throw error(403, 'Access denied');
    }

    const { data: board } = await locals.supabase
      .from('surfboards')
      .select('user_id')
      .eq('id', boardId)
      .single();

    if (!board || board.user_id !== user.id) {
      throw error(403, 'Access denied');
    }

    // Log form data for now (TODO: create record + send email)
    const formData = {
      board_id: boardId,
      target_area: form.get('target_area')?.toString(),
      skill_level: form.get('skill_level')?.toString(),
      age_range: form.get('age_range')?.toString(),
      start_date: form.get('start_date')?.toString(),
      end_date: form.get('end_date')?.toString(),
      goal: form.get('goal')?.toString(),
      notes: form.get('notes')?.toString()
    };

    console.log('Boost request form data:', formData);

    // TODO: Insert into boost_requests table and send email
    // For now, just redirect back with success
    return {
      success: true,
      message: 'Boost request submitted successfully!'
    };
  }
};

