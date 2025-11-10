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

  const {
    data: { session },
    error: sessionErr
  } = await supabase.auth.getSession();

  event.locals.session = session ?? null;
  event.locals.user = session?.user ?? null;
  event.locals.getSession = async () => {
    const {
      data: { session: refreshedSession }
    } = await supabase.auth.getSession();
    return refreshedSession ?? null;
  };

  const path = event.url.pathname;
  const isAllowlisted = ALLOWLIST.some((p) => path === p || path.startsWith(`${p}/`));
  const isProtected   = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[hooks]',
      'path=', path,
      'isProtected=', isProtected,
      'session=', session ? 'yes' : 'no',
      'user=', session?.user?.id ?? null,
      sessionErr ? `(getSession error: ${sessionErr.message})` : ''
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
