// src/routes/onboarding/+page.server.ts
import { redirect, type PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // If no user, redirect to login
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // Fetch profile to check deletion status
  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('is_deleted')
    .eq('id', locals.user.id)
    .maybeSingle();

  // If profile is deleted, redirect to username onboarding for reactivation
  if (profile && profile.is_deleted === true) {
    throw redirect(303, '/onboarding/username?reactivate=1');
  }

  // If user exists and profile is not deleted, redirect to home
  throw redirect(303, '/');
};

