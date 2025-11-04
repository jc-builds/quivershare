import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Create a Supabase client configured for PKCE-based OAuth flow
export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',          // ← ensures Google returns ?code=... instead of #access_token
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
