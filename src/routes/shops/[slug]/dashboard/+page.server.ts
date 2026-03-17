import { redirect, error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
  const user = locals.user;
  if (!user) throw redirect(303, `/login?redirectTo=/shops/${params.slug}/dashboard`);

  const { data: shop, error: shopErr } = await locals.supabase
    .from('shops')
    .select('id, name, slug, owner_user_id')
    .eq('slug', params.slug)
    .maybeSingle();

  if (shopErr || !shop) {
    throw error(404, 'Shop not found');
  }

  let isAdmin = false;
  if (shop.owner_user_id !== user.id) {
    const { data: profile } = await locals.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    isAdmin = profile?.is_admin === true;
    if (!isAdmin) {
      throw error(403, 'You do not have permission to access this dashboard');
    }
  }

  const status = url.searchParams.get('status') || 'active';

  let query = locals.supabase
    .from('surfboards')
    .select(`
      id,
      name,
      created_at,
      state,
      price,
      city,
      region,
      surfboard_images(image_url, position)
    `)
    .eq('shop_id', shop.id)
    .eq('owner_type', 'shop')
    .eq('is_deleted', false);

  if (status === 'active') query = query.eq('state', 'active');
  else if (status === 'inactive') query = query.eq('state', 'inactive');

  const { data, error: boardsErr } = await query
    .order('position', { foreignTable: 'surfboard_images', ascending: true })
    .order('created_at', { ascending: false });

  if (boardsErr) {
    console.error('Error loading shop boards:', boardsErr);
    return { shop, boards: [], errorMessage: boardsErr.message, status };
  }

  const boards = (data ?? []).map((board: any) => ({
    ...board,
    image_url: board.surfboard_images?.[0]?.image_url || null
  }));

  return { shop, boards, errorMessage: null, status };
};

export const actions: Actions = {
  updateState: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) {
      return fail(401, { context: 'updateState', success: false, message: 'Unauthorized' });
    }

    const { data: shop, error: shopErr } = await locals.supabase
      .from('shops')
      .select('id, owner_user_id')
      .eq('slug', params.slug)
      .maybeSingle();

    if (shopErr || !shop) {
      return fail(404, { context: 'updateState', success: false, message: 'Shop not found' });
    }

    if (shop.owner_user_id !== user.id) {
      const { data: profile } = await locals.supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        return fail(403, { context: 'updateState', success: false, message: 'Permission denied' });
      }
    }

    const form = await request.formData();
    const boardId = form.get('boardId')?.toString();
    const newState = form.get('state')?.toString();

    if (!boardId) {
      return fail(400, { context: 'updateState', success: false, message: 'Missing board ID' });
    }

    if (newState !== 'active' && newState !== 'inactive') {
      return fail(400, { context: 'updateState', success: false, message: 'Invalid state value' });
    }

    const { data: board, error: boardError } = await locals.supabase
      .from('surfboards')
      .select('id')
      .eq('id', boardId)
      .eq('shop_id', shop.id)
      .eq('owner_type', 'shop')
      .eq('is_deleted', false)
      .single();

    if (boardError || !board) {
      return fail(404, { context: 'updateState', success: false, message: 'Board not found' });
    }

    const { error: updateError } = await locals.supabase
      .from('surfboards')
      .update({ state: newState })
      .eq('id', boardId);

    if (updateError) {
      console.error('State update error:', updateError.message);
      return fail(500, { context: 'updateState', success: false, message: 'Failed to update state' });
    }

    return { context: 'updateState', success: true, state: newState, boardId };
  }
};
