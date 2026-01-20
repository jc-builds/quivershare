<script lang="ts">
  import { pageTitle } from '$lib/title';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

  export let data: { 
    user: import('@supabase/supabase-js').User | null;
    profile: { username: string | null; profile_picture_url: string | null; is_deleted?: boolean | null } | null;
  };

  const isActiveUser = !!(
    data.user &&
    data.profile &&
    data.profile.is_deleted !== true
  );

  const supabase = createBrowserClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY
  );

  let email = '';
  let password = '';
  let loading = false;
  let submitting: 'login' | 'signup' | null = null;
  let message: string | null = null;
  let error: string | null = null;

  // checkEmail=1 state (must disable form + show message)
  $: checkEmail = get(page).url.searchParams.get('checkEmail') === '1';

  async function handleSignup() {
    if (checkEmail || loading) return;

    loading = true;
    submitting = 'signup';
    error = null;
    message = null;

    const origin = get(page).url.origin;

    const emailRedirectTo = `${origin}/auth/email-callback`;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo }
    });

    loading = false;
    submitting = null;

    if (signUpError) {
      error = signUpError.message;
      return;
    }

    // neutral confirmation state
    window.location.href = '/login?checkEmail=1';
  }

  async function handleLogin() {
    if (checkEmail || loading) return;

    loading = true;
    submitting = 'login';
    error = null;
    message = null;

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    loading = false;
    submitting = null;

    if (loginError) {
      error = loginError.message;
      return;
    }

    window.location.href = '/';
  }
</script>

<svelte:head>
  <title>{pageTitle('Sign In')}</title>
</svelte:head>

<section class="min-h-screen bg-background text-foreground flex flex-col items-center justify-center text-center px-4 py-24 space-y-6">
  {#if isActiveUser}
    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">You're already signed in</h1>
    <a 
      class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background" 
      href="/my-boards"
    >
      Go to My Boards
    </a>
  {:else}
    {#if checkEmail}
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
        Check your email
      </h1>
      <p class="text-sm text-muted-foreground max-w-md">
        We sent you a confirmation link. Click it to finish creating your account.
      </p>
    {:else}
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
        Sign in to QuiverShare
      </h1>
    {/if}

    <!-- OAuth -->
    <a 
      class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      href="/auth/start"
    >
      Sign in with Google
    </a>

    <div class="text-sm text-muted-foreground">or</div>

    <!-- Email sign-up -->
    <form
      class="w-full max-w-sm space-y-4 text-left"
      on:submit|preventDefault={handleLogin}
    >
      <div class="space-y-1">
        <label for="email" class="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autocomplete="email"
          bind:value={email}
          disabled={checkEmail || loading}
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        />
      </div>

      <div class="space-y-1">
        <label for="password" class="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minlength="8"
          autocomplete="current-password"
          bind:value={password}
          disabled={checkEmail || loading}
          class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        />
      </div>

      <div class="space-y-2">
        <button
          type="submit"
          disabled={checkEmail || loading}
          class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:hover:bg-primary"
        >
          {submitting === 'login' ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          disabled={checkEmail || loading}
          on:click={handleSignup}
          class="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold border border-input bg-background text-foreground hover:bg-muted transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
        >
          {submitting === 'signup' ? 'Creating account…' : 'Create account'}
        </button>
      </div>

      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}
      {#if message}
        <p class="text-sm text-muted-foreground">{message}</p>
      {/if}

      <p class="text-xs text-muted-foreground text-center">
        We’ll email you a confirmation link to finish signing up.
      </p>
    </form>
  {/if}
</section>
