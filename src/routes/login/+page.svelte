<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { pageTitle } from '$lib/title';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';

  export let data: {
    user: import('@supabase/supabase-js').User | null;
    profile: {
      username: string | null;
      profile_picture_url: string | null;
      is_deleted?: boolean | null;
    } | null;
  };

  export let form: { error?: string; next?: string } | undefined;

  const isActiveUser = !!(
    data.user &&
    data.profile &&
    data.profile.is_deleted !== true
  );

  let email = '';
  let password = '';
  let submitting: 'login' | 'signup' | null = null;
  let actionError: string | null = null;

  // checkEmail=1 state (disable everything)
  $: checkEmail = get(page).url.searchParams.get('checkEmail') === '1';
  $: showCheckEmail = checkEmail || form?.next === '/login?checkEmail=1';
  $: isDisabled = showCheckEmail || submitting !== null;
  $: error = actionError ?? form?.error ?? null;

  const formEnhance = ({ action }: { action: URL }) => {
    const actionUrl = action?.toString() ?? '';
    submitting = actionUrl.includes('/signup') ? 'signup' : 'login';
    actionError = null;

    return async ({
      result,
      update
    }: {
      result: { type: string; data?: { next?: string; error?: string } };
      update: () => Promise<void>;
    }) => {
      submitting = null;

      if (result.type === 'success') {
        const next = result.data?.next;
        if (next) {
          window.location.href = next;
          return;
        }
      }

      if (result.type === 'failure') {
        actionError = result.data?.error ?? null;
      }

      await update();
    };
  };
</script>

<svelte:head>
  <title>{pageTitle('Sign In')}</title>
</svelte:head>

<section class="min-h-screen bg-background text-foreground flex flex-col items-center justify-center text-center px-4 py-24 space-y-6">
  {#if isActiveUser}
    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
      You're already signed in
    </h1>
    <a
      href="/my-boards"
      class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors"
    >
      Go to My Boards
    </a>
  {:else}
    {#if showCheckEmail}
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
        Check your email
      </h1>
      <p class="text-sm text-muted-foreground max-w-md">
        We sent you a confirmation link. Click it to finish creating your account.
      </p>
    {:else}
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
        Sign in to QuiverShare
      </h1>
    {/if}

    <!-- OAuth -->
    <a
      href="/auth/start"
      class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors disabled:opacity-60"
      aria-disabled={isDisabled}
      class:pointer-events-none={isDisabled}
    >
      Sign in with Google
    </a>

    <div class="text-sm text-muted-foreground">or</div>

    <!-- Email login/signup -->
    <form
      class="w-full max-w-sm space-y-4 text-left"
      method="POST"
      action="?/login"
      use:enhance={formEnhance}
    >
      <div class="space-y-1">
        <label for="email" class="text-sm font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          bind:value={email}
          required
          autocomplete="email"
          disabled={isDisabled}
          class="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        />
      </div>

      <div class="space-y-1">
        <label for="password" class="text-sm font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          bind:value={password}
          required
          minlength="8"
          autocomplete="current-password"
          disabled={isDisabled}
          class="w-full rounded-md border px-3 py-2 text-sm disabled:opacity-60"
        />
      </div>

      <div class="space-y-2">
        <button
          type="submit"
          disabled={isDisabled}
          class="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
        >
          {submitting === 'login' ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          type="submit"
          formaction="?/signup"
          disabled={isDisabled}
          class="w-full px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-60"
        >
          {submitting === 'signup' ? 'Creating account…' : 'Create account'}
        </button>
      </div>

      {#if error}
        <p class="text-sm text-red-500">{error}</p>
      {/if}

      <p class="text-xs text-muted-foreground text-center">
        We’ll email you a confirmation link to finish signing up.
      </p>
    </form>
  {/if}
</section>
