import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  // End the Supabase session (clears cookies + invalidates JWT)
  await locals.supabase.auth.signOut();

  // Redirect the user back to the login page
  throw redirect(303, '/login');
};
