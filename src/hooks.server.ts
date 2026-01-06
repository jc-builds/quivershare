// src/hooks.server.ts
import * as ssr from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const PROTECTED_PREFIXES = ['/create-surfboard', '/edit-surfboard', '/profile/edit'];
const ALLOWLIST = ['/login', '/auth', '/auth/callback'];

const { createServerClient } = ssr;

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => event.cookies.set(key, value, { path: '/', ...options }),
        remove: (key, options) => event.cookies.delete(key, { path: '/', ...options })
      }
    }
  );

  event.locals.supabase = supabase;

  // Set session to null initially - it will only be populated if locals.getSession() is called
  event.locals.session = null;

  // Get authenticated user using getUser() as the single source of truth
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    // Only log unexpected errors, not "auth session missing" errors
    if (userError.message && !userError.message.includes('session missing')) {
      console.error('Error fetching user:', userError);
    }
    event.locals.user = null;
  } else {
    event.locals.user = user ?? null;
  }

  event.locals.getSession = async () => {
    const {
      data: { session: refreshedSession }
    } = await supabase.auth.getSession();
    return refreshedSession ?? null;
  };

  // Check if user is active (has profile and not deleted)
  let isActiveUser = false;
  if (event.locals.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_deleted')
      .eq('id', event.locals.user.id)
      .maybeSingle();
    
    isActiveUser = !!(profile && profile.is_deleted !== true);
  }

  const path = event.url.pathname;
  const isAllowlisted = ALLOWLIST.some((p) => path === p || path.startsWith(`${p}/`));
  const isProtected   = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[hooks]',
      'path=', path,
      'isProtected=', isProtected,
      'session=', event.locals.user ? 'yes' : 'no',
      'isActiveUser=', isActiveUser
    );
  }

  // Gate protected routes on "has an active user?"
  if (isProtected && !isActiveUser && !isAllowlisted) {
    const redirectTo = encodeURIComponent(event.url.pathname + event.url.search);
    throw redirect(303, `/login?redirectTo=${redirectTo}`);
  }

  // Let the request through
  return resolve(event, {
    // Optional: preserve useful Supabase headers for Range queries, etc.
    filterSerializedResponseHeaders: (name) =>
      name === 'content-range' || name === 'x-supabase-api-version'
  });
};
