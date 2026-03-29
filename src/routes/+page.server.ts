import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const { data: rows } = await locals.supabase
    .from('surfboards')
    .select(
      `
        id,
        name,
        make,
        length,
        price,
        style,
        condition,
        city,
        region,
        is_curated,
        owner_type,
        shop_id,
        user_id,
        created_at,
        surfboard_images (
          image_url,
          position
        )
      `
    )
    .eq('is_deleted', false)
    .or('state.is.null,state.eq.active')
    .order('created_at', { ascending: false })
    .limit(8);

  const boards = (rows ?? []).map((board: any) => {
    const { surfboard_images, ...rest } = board;
    return { ...rest, image_url: surfboard_images?.[0]?.image_url ?? null };
  });

  const shopIds = [
    ...new Set(
      boards
        .filter((b: any) => b.owner_type === 'shop' && b.shop_id)
        .map((b: any) => b.shop_id as string)
    )
  ];

  if (shopIds.length > 0) {
    const { data: shops } = await locals.supabase
      .from('shops')
      .select('id, name, logo_image_url')
      .in('id', shopIds);

    const shopMap = new Map<string, { name: string; logo_image_url: string | null }>();
    for (const s of shops ?? []) {
      shopMap.set(s.id, { name: s.name, logo_image_url: s.logo_image_url });
    }

    for (const b of boards as any[]) {
      if (b.owner_type === 'shop' && b.shop_id) {
        const shop = shopMap.get(b.shop_id);
        b.shop_name = shop?.name ?? null;
        b.shop_logo_url = shop?.logo_image_url ?? null;
      } else {
        b.shop_name = null;
        b.shop_logo_url = null;
      }
    }
  }

  return { featuredBoards: boards };
};
