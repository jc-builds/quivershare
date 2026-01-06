// src/routes/onboarding/+server.ts
import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  // Not logged in → login
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // Fetch minimal profile state
  const { data: profile } = await locals.supabase
    .from('profiles')
    .select('is_deleted')
    .eq('id', locals.user.id)
    .maybeSingle();

  // Deleted user → onboarding reactivation
  if (profile?.is_deleted === true) {
    throw redirect(303, '/onboarding/username?reactivate=1');
  }

  // Active user → home
  throw redirect(303, '/');
};
