<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { get } from 'svelte/store';
    import { createBrowserClient } from '@supabase/ssr';
    import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  
    const supabase = createBrowserClient(
      PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY
    );
  
    let error: string | null = null;
  
    onMount(async () => {
      const url = get(page).url;
      const code = url.searchParams.get('code');
      const next =
        url.searchParams.get('redirect_to') ?? '/onboarding/username';

      if (!code) {
        await goto('/login');
        return;
      }
  
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);
  
      if (exchangeError) {
        console.error('Email callback exchange error:', exchangeError.message);
        error = exchangeError.message;
        await goto('/login');
        return;
      }
  
      // Session cookie is now set in a way hooks.server.ts can read
      await goto(next);
    });
  </script>
  
  <section class="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-24 text-center">
    <div class="space-y-3">
      <h1 class="text-2xl font-semibold tracking-tight">Signing you in…</h1>
      <p class="text-sm text-muted-foreground">
        Completing email confirmation.
      </p>
      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}
    </div>
  </section>
  