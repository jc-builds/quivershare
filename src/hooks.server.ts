// src/hooks.server.ts
import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const PROTECTED_PREFIXES = ['/create-surfboard', '/edit-surfboard'];
const ALLOWLIST = ['/login', '/auth', '/auth/callback'];

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => event.cookies.get(name),
        set: (name, value, options) =>
          event.cookies.set(name, value, { ...options, path: '/' }),
        remove: (name, options) =>
          event.cookies.delete(name, { ...options, path: '/' })
      }
    }
  );

  event.locals.supabase = supabase;

  // 1) Load/refresh session from cookies (fast, ok for "is logged in?")
  const {
    data: { session },
    error: sessionErr
  } = await supabase.auth.getSession();
  event.locals.session = session ?? null;

  // 2) Fetch verified user (trusted identity for writes)
  const {
    data: { user },
    error: userErr
  } = await supabase.auth.getUser();
  event.locals.user = user ?? null;

  const path = event.url.pathname;
  const isAllowlisted = ALLOWLIST.some((p) => path === p || path.startsWith(`${p}/`));
  const isProtected   = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[hooks]',
      'path=', path,
      'isProtected=', isProtected,
      'session=', session ? 'yes' : 'no',
      'user=', user?.id ?? null,
      sessionErr ? `(getSession error: ${sessionErr.message})` : '',
      userErr ? `(getUser error: ${userErr.message})` : ''
    );
  }

  // Gate protected routes on "has a session?"
  if (isProtected && !session && !isAllowlisted) {
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
