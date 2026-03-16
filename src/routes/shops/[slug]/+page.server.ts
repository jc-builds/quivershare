import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const slug = params.slug;
  const user = locals.user;

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
    .eq('slug', slug)
    .maybeSingle();

  if (shopErr || !shop) {
    throw error(404, 'Shop not found');
  }

  if (!shop.is_active) {
    throw error(404, 'Shop not found');
  }

  let isOwnerOrAdmin = false;
  if (user) {
    if (shop.owner_user_id === user.id) {
      isOwnerOrAdmin = true;
    } else {
      const { data: profile } = await locals.supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      isOwnerOrAdmin = profile?.is_admin === true;
    }
  }

  // Fetch active, non-deleted surfboards for this shop
  const { data: boards, error: boardsErr } = await locals.supabase
    .from('surfboards')
    .select(`
      id,
      name,
      make,
      length,
      width,
      thickness,
      volume,
      price,
      condition,
      style,
      city,
      region,
      created_at,
      surfboard_images (
        image_url,
        position
      )
    `)
    .eq('shop_id', shop.id)
    .eq('owner_type', 'shop')
    .eq('is_deleted', false)
    .or('state.is.null,state.eq.active')
    .order('created_at', { ascending: false });

  if (boardsErr) {
    console.warn('Error loading shop boards:', boardsErr.message);
  }

  const boardsWithImage = (boards ?? []).map((board: any) => {
    const { surfboard_images, ...rest } = board;
    const sorted = (surfboard_images ?? []).sort(
      (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
    );
    return {
      ...rest,
      image_url: sorted[0]?.image_url ?? null
    };
  });

  return {
    shop,
    boards: boardsWithImage,
    isOwnerOrAdmin
  };
};
