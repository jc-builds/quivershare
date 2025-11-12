import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  const {
    data: { user },
    error: userErr
  } = await locals.supabase.auth.getUser();
  if (userErr || !user) throw error(401, 'Unauthorized');

  let surfboard_id: string | undefined;
  try {
    ({ surfboard_id } = await request.json());
  } catch {
    throw error(400, 'Invalid JSON body');
  }
  if (!surfboard_id || typeof surfboard_id !== 'string') throw error(400, 'surfboard_id is required');

  const { data: board, error: boardErr } = await locals.supabase.from('surfboards').select('id,user_id').eq('id', surfboard_id).maybeSingle();
  if (boardErr) {
    console.error('[BOOST] fetch_surfboard', boardErr);
    throw error(500, 'Failed to confirm surfboard owner');
  }
  if (!board) throw error(404, 'Surfboard not found');
  if (board.user_id !== user.id) throw error(403, 'Forbidden');

  const { data: boostRow, error: rpcErr } = await locals.supabase
    .rpc('use_boost_credit_and_create', { p_surfboard_id: surfboard_id, p_user_id: user.id })
    .single();
  if (rpcErr) {
    console.error('[BOOST][RPC]', { message: rpcErr.message, code: rpcErr.code, details: (rpcErr as any).details });
    if (rpcErr.message?.includes('NO_CREDITS')) {
      return new Response(JSON.stringify({ error: 'No boost credits left', stage: 'rpc', code: rpcErr.code }), { status: 402 });
    }
    return new Response(
      JSON.stringify({ error: 'RPC failed', stage: 'rpc', code: rpcErr.code, message: rpcErr.message, details: (rpcErr as any).details }),
      { status: 500 }
    );
  }

  const boostId = (boostRow as { id: string }).id;

  const { error: boostUpdateErr } = await locals.supabase.from('boosts').update({ status: 'delivered', updated_at: new Date().toISOString() }).eq('id', boostId);
  if (boostUpdateErr) {
    console.error('[BOOST] update_boost', boostUpdateErr);
    throw error(500, 'Failed to confirm boost delivery');
  }

  try {
    const { data: stats, error: statsFetchErr } = await locals.supabase.from('board_stats').select('boosts_count').eq('board_id', surfboard_id).maybeSingle();
    if (statsFetchErr) console.error('[BOOST] board_stats select', statsFetchErr);
    const next = (stats?.boosts_count ?? 0) + 1;
    const { error: statsErr } = await locals.supabase.from('board_stats').upsert({ board_id: surfboard_id, boosts_count: next }, { onConflict: 'board_id' });
    if (statsErr) console.error('[BOOST] board_stats upsert', statsErr);
  } catch (e) {
    console.error('[BOOST] board_stats exception', e);
  }

  return json({ ok: true });
};
