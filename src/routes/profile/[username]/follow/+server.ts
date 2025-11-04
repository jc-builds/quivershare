// src/routes/profile/[username]/follow/+server.ts
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

  // Get the profile to follow
  const { data: targetProfile, error: profileError } = await locals.supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();

  if (profileError || !targetProfile) {
    throw error(404, 'Profile not found');
  }

  // Can't follow yourself
  if (targetProfile.id === locals.user.id) {
    throw error(400, 'Cannot follow yourself');
  }

  // Insert follow relationship
  const { error: followError } = await locals.supabase
    .from('follows')
    .insert({
      follower_id: locals.user.id,
      following_id: targetProfile.id
    });

  if (followError) {
    // If already following, ignore the error (idempotent)
    if (followError.code !== '23505') { // Unique violation
      console.error('Follow error:', followError);
      throw error(500, 'Failed to follow user');
    }
  }

  return json({ success: true });
};
