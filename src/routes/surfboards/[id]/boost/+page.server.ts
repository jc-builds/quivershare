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
  currentBoost: {
    id: string;
    status: string;
    target_area: string;
    start_date: string;
    end_date: string;
    kind: string;
  } | null;
  hasActiveBoost: boolean;
};

export type PageServerData = BoardPageData;

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = params.id;

  if (!id) {
    throw error(404, 'Surfboard not found');
  }

  // Fetch the board (exclude deleted)
  const { data: surfboard, error: boardErr } = await locals.supabase
    .from('surfboards')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
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

  // Fetch the most recent boost for this board
  const { data: boostData, error: boostError } = await locals.supabase
    .from('boosts')
    .select('id, status, target_area, start_date, end_date, kind')
    .eq('board_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (boostError) {
    console.warn('Error fetching boost:', boostError);
  }

  const currentBoost = boostData ?? null;
  const hasActiveBoost = currentBoost ? (currentBoost.status === 'pending' || currentBoost.status === 'live') : false;

  return {
    board: surfboard,
    images: allImages,
    owner: ownerProfile ?? null,
    canEdit,
    currentBoost,
    hasActiveBoost
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
      .eq('is_deleted', false)
      .single();

    if (!board || board.user_id !== user.id) {
      throw error(403, 'Access denied');
    }

    // Check if there's already an active boost for this board
    const { data: existingBoost, error: existingBoostError } = await locals.supabase
      .from('boosts')
      .select('id, status')
      .eq('board_id', boardId)
      .in('status', ['pending', 'live'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBoostError) {
      console.error('Error checking for existing boost:', existingBoostError);
      return {
        success: false,
        message: "Something went wrong checking for existing Boosts. Please try again."
      };
    }

    if (existingBoost) {
      return {
        success: false,
        message: "This board already has a Boost in progress. You can request a new Boost after the current one completes."
      };
    }

    // Validate required fields
    const targetArea = form.get('target_area')?.toString()?.trim();
    const startDateStr = form.get('start_date')?.toString()?.trim();

    if (!targetArea) {
      return {
        success: false,
        message: 'Please select a target area for your boost.'
      };
    }

    if (!startDateStr) {
      return {
        success: false,
        message: 'Please select a start date for your boost.'
      };
    }

    // Parse start date and calculate end date (14 days later)
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) {
      return {
        success: false,
        message: 'Invalid start date format.'
      };
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14);

    const userId = user.id;

    // 1. Fetch user's boost credits
    const { data: credits, error: creditsError } = await locals.supabase
      .from('boost_credits')
      .select('free_credits, paid_credits, total_credits')
      .eq('user_id', userId)
      .single();

    if (creditsError || !credits) {
      console.error('Error fetching boost credits:', creditsError);
      return {
        success: false,
        message: "Something went wrong checking your Boost credits. Please try again."
      };
    }

    // 2. Check if user has any credits
    const totalCredits = credits.total_credits ?? (credits.free_credits ?? 0) + (credits.paid_credits ?? 0);
    if (totalCredits <= 0) {
      return {
        success: false,
        message: "You don't have any Boost credits available."
      };
    }

    // 3. Decide which kind of credit to use
    const freeCredits = credits.free_credits ?? 0;
    const paidCredits = credits.paid_credits ?? 0;
    let kind: 'free' | 'paid';
    let updateField: 'free_credits' | 'paid_credits';

    if (freeCredits > 0) {
      kind = 'free';
      updateField = 'free_credits';
    } else if (paidCredits > 0) {
      kind = 'paid';
      updateField = 'paid_credits';
    } else {
      // Shouldn't happen if total_credits > 0, but be safe
      return {
        success: false,
        message: "You don't have any Boost credits available."
      };
    }

    // 4. Consume 1 credit
    const currentValue = updateField === 'free_credits' ? freeCredits : paidCredits;
    if (currentValue <= 0) {
      return {
        success: false,
        message: "You don't have any Boost credits available."
      };
    }

    const { error: creditUpdateError } = await locals.supabase
      .from('boost_credits')
      .update({
        [updateField]: currentValue - 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq(updateField, currentValue); // Guard: only update if value hasn't changed

    if (creditUpdateError) {
      console.error('Error updating boost credits:', creditUpdateError);
      return {
        success: false,
        message: "Something went wrong consuming your Boost credit. Please try again."
      };
    }

    // 5. Insert boost row
    const { data: newBoost, error: boostInsertError } = await locals.supabase
      .from('boosts')
      .insert([
        {
          board_id: boardId,
          user_id: userId,
          kind,
          status: 'pending',
          target_area: targetArea,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('id')
      .single();

    if (boostInsertError || !newBoost) {
      console.error('Error inserting boost:', boostInsertError);
      // Try to restore the credit if boost insert failed
      await locals.supabase
        .from('boost_credits')
        .update({
          [updateField]: currentValue,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      return {
        success: false,
        message: "Something went wrong creating your Boost. Please try again."
      };
    }

    // 6. Increment board_stats.boosts_count
    const { data: stats, error: statsFetchError } = await locals.supabase
      .from('board_stats')
      .select('boosts_count')
      .eq('board_id', boardId)
      .maybeSingle();

    if (statsFetchError) {
      console.error('Error fetching board_stats:', statsFetchError);
      // Don't fail the whole operation if stats fetch fails
    }

    const nextBoostsCount = (stats?.boosts_count ?? 0) + 1;
    const { error: statsUpsertError } = await locals.supabase
      .from('board_stats')
      .upsert(
        {
          board_id: boardId,
          boosts_count: nextBoostsCount,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'board_id' }
      );

    if (statsUpsertError) {
      console.error('Error upserting board_stats:', statsUpsertError);
      // Don't fail the whole operation if stats update fails
    }

    // 7. Return success
    return {
      success: true,
      message: "Your Boost has been created and is now pending review & setup up."
    };
  }
};

