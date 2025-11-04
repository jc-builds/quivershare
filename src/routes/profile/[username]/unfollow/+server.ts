// src/routes/profile/[username]/unfollow/+server.ts
import { json, error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  const username = params.username?.toLowerCase();
  if (!username) {
    throw error(400, 'Invalid username');
  }

  // Get the profile to unfollow
  const { data: targetProfile, error: profileError } = await locals.supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (profileError || !targetProfile) {
    throw error(404, 'Profile not found');
  }

  // Delete follow relationship
  const { error: unfollowError } = await locals.supabase
    .from('follows')
    .delete()
    .eq('follower_id', locals.user.id)
    .eq('following_id', targetProfile.id);

  if (unfollowError) {
    console.error('Unfollow error:', unfollowError);
    throw error(500, 'Failed to unfollow user');
  }

  return json({ success: true });
};
