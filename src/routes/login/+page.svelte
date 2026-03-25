<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { pageTitle } from '$lib/title';
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';

  let turnstileScriptLoaded = false;

  function initTurnstile(node: HTMLElement) {
    const render = () => {
      if (window.turnstile) {
        window.turnstile.render(node, {
          sitekey: PUBLIC_TURNSTILE_SITE_KEY,
          theme: 'dark'
        });
      }
    };

    if (window.turnstile) {
      render();
      return;
    }

    if (!turnstileScriptLoaded) {
      turnstileScriptLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
  }

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
  let emailFormRevealed = false;

  $: redirectTo = $page.url.searchParams.get('redirectTo') ?? '';
  $: isShopIntent = redirectTo === '/shops/new';
  $: oauthHref = redirectTo
    ? `/auth/start?redirect_to=${encodeURIComponent(redirectTo)}`
    : '/auth/start';

  $: isVerified = $page.url.searchParams.get('verified') === '1';
  $: checkEmail = get(page).url.searchParams.get('checkEmail') === '1';
  $: showCheckEmail = checkEmail || (form?.next ?? '').includes('checkEmail=1');
  $: isDisabled = showCheckEmail || submitting !== null;

  $: oauthError =
    get(page).url.searchParams.get('error') === 'oauth_not_allowed'
      ? 'This account was created with email and password. Please sign in using email.'
      : null;

  $: error = actionError ?? form?.error ?? oauthError ?? null;
  $: showEmailForm = emailFormRevealed || isVerified || !!error;
  $: showShopCta = !redirectTo && !isActiveUser && !showCheckEmail && !isVerified;

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
  <title>{pageTitle(isShopIntent ? 'Create Your Shop' : 'Sign In')}</title>
</svelte:head>

<section class="min-h-screen bg-background text-foreground flex flex-col items-center justify-center text-center px-4 py-24 space-y-6">
  {#if isActiveUser}
    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
      You&rsquo;re already signed in
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
    {:else if isVerified}
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
        Email confirmed
      </h1>
      <p class="text-sm text-muted-foreground max-w-md">
        Sign in with the email and password you just created.
      </p>
    {:else if isShopIntent}
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
        Create your shop
      </h1>
      <p class="text-sm text-muted-foreground max-w-sm">
        Sign in or create an account to get started.
      </p>
    {:else}
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
        Sign in to QuiverShare
      </h1>
    {/if}

    {#if !showCheckEmail}
      {#if !isVerified}
        <!-- Google OAuth (primary) -->
        <a
          href={oauthHref}
          class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors"
        >
          Sign in with Google
        </a>
      {/if}

      {#if showEmailForm}
        {#if !isVerified}
          <div class="text-sm text-muted-foreground">or</div>
        {/if}

        <form
          class="w-full max-w-sm space-y-4 text-left"
          method="POST"
          action="?/login"
          use:enhance={formEnhance}
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />

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
              class="w-full rounded-md border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground/70 px-3 py-2 disabled:opacity-60"
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
              class="w-full rounded-md border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground/70 px-3 py-2 disabled:opacity-60"
            />
          </div>

          <div class="space-y-2">
            <button
              type="submit"
              disabled={isDisabled}
              class="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-60"
            >
              {submitting === 'login' ? 'Signing in\u2026' : 'Sign in'}
            </button>

            {#if !isVerified}
              <div use:initTurnstile class="flex justify-center"></div>
              <button
                type="submit"
                formaction="?/signup"
                disabled={isDisabled}
                class="w-full px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-60"
              >
                {submitting === 'signup' ? 'Creating account\u2026' : 'Create account'}
              </button>
            {/if}
          </div>

          {#if error}
            <p class="text-sm text-red-500">{error}</p>
          {/if}

          <p class="text-xs text-muted-foreground text-center">
            We&rsquo;ll email you a confirmation link to finish signing up.
          </p>
        </form>
      {:else}
        <button
          type="button"
          on:click={() => { emailFormRevealed = true; }}
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Use email and password instead
        </button>
      {/if}
    {/if}

    {#if showShopCta}
      <div class="w-full max-w-sm border-t border-border pt-6 mt-2 text-center space-y-2">
        <p class="text-sm text-muted-foreground">Are you creating a shop?</p>
        <a
          href="/login?redirectTo=%2Fshops%2Fnew"
          class="text-sm font-medium text-primary hover:text-primary-alt transition-colors"
        >
          Continue as a shop owner &rarr;
        </a>
      </div>
    {/if}
  {/if}
</section>
