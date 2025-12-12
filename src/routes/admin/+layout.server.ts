// src/routes/admin/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Get the current session user
  const session = (await locals.getSession?.()) ?? null;
  const user = locals.user;

  // If no session or no user, redirect to home
  if (!session || !user) {
    throw redirect(303, '/');
  }

  // Fetch the user's profile to check is_admin
  const { data: profile, error } = await locals.supabase
    .from('profiles')
    .select('id, username, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  // If no profile or not an admin, redirect to home
  if (error || !profile || profile.is_admin !== true) {
    throw redirect(303, '/');
  }

  // Return profile for nested routes
  return {
    profile
  };
};

