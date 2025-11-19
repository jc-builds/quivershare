<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import favicon from "$lib/assets/favicon.svg";
  import "../app.css";

  export let data: {
    session: import('@supabase/supabase-js').Session | null;
    user: import('@supabase/supabase-js').User | null;
    profile: { username: string | null; profile_picture_url: string | null } | null;
  };

  const isAuthed = !!data.session;

  const displayName =
    data.profile?.username
      ?? data.user?.user_metadata?.preferred_username
      ?? data.user?.user_metadata?.name
      ?? 'User';

  const profileImageUrl = data.profile?.profile_picture_url ?? null;

  const initialsSource = (data.profile?.username ?? displayName ?? 'User').trim();
  const initials =
    initialsSource
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('') || 'U';

  // Dropdown state
  let mobileMenuOpen = false;
  let profileMenuOpen = false;
  let profileMenuElement: HTMLElement;
  let mobileMenuElement: HTMLElement;

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function toggleProfileMenu() {
    profileMenuOpen = !profileMenuOpen;
  }

  function closeMenus() {
    mobileMenuOpen = false;
    profileMenuOpen = false;
  }

  // Click outside handler
  function handleClickOutside(event: MouseEvent) {
    if (!browser) return;
    const target = event.target as Node;
    if (profileMenuOpen && profileMenuElement && !profileMenuElement.contains(target)) {
      profileMenuOpen = false;
    }
    if (mobileMenuOpen && mobileMenuElement && !mobileMenuElement.contains(target)) {
      mobileMenuOpen = false;
    }
  }

  // Set up click outside listener in browser only
  onMount(() => {
    if (!browser) return;
    
    // Use capture phase and setTimeout to avoid immediate closure from button click
    const setupListener = () => {
      document.addEventListener('click', handleClickOutside, true);
    };
    
    // Delay to avoid immediate closure
    const timeoutId = setTimeout(setupListener, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside, true);
    };
  });

  onDestroy(() => {
    if (!browser) return;
    document.removeEventListener('click', handleClickOutside, true);
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- Header -->
<nav class="w-full border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
  <div class="mx-auto flex h-16 items-center justify-between px-4 md:px-8 lg:max-w-6xl">
    <!-- Left: logo/brand -->
    <a href="/" class="text-xl font-bold text-foreground" data-sveltekit-prefetch>
      <img 
        src="/FullLogo_Transparent_NoBuffer.png" 
        alt="QuiverShare" 
        class="h-10 w-auto"
      />
    </a>

    <!-- Center: nav links (if any) -->
    <div class="hidden items-center gap-6 text-sm text-muted-foreground md:flex nav-li-font">
      {#if isAuthed}
        <a href="/s" class="hover:text-foreground" data-sveltekit-prefetch>Browse Boards</a>
        <a href="/my-boards" class="hover:text-foreground" data-sveltekit-prefetch>My Boards</a>
      {:else}
        <a href="/s" class="hover:text-foreground" data-sveltekit-prefetch>Browse Boards</a>
        <a href="/help" class="hover:text-foreground" data-sveltekit-prefetch>Help</a>
        <a href="/about" class="hover:text-foreground" data-sveltekit-prefetch>About</a>
      {/if}
    </div>

    <!-- Right: auth / profile / buttons -->
    <div class="flex items-center gap-3">
      {#if isAuthed}
        <!-- Desktop profile menu -->
        <div class="relative hidden md:block" bind:this={profileMenuElement}>
          <button 
            type="button" 
            class="inline-flex items-center rounded-md px-2 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface" 
            aria-label="Open profile menu"
            on:click={toggleProfileMenu}
          >
            {#if profileImageUrl}
              <img
                src={profileImageUrl}
                alt={`Profile picture of ${displayName}`}
                class="w-8 h-8 rounded-full object-cover"
              />
            {:else}
              <span
                class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-foreground nav-li-font"
                aria-hidden="true"
              >
                {initials}
              </span>
              <span class="sr-only">Profile menu</span>
            {/if}
          </button>
          {#if profileMenuOpen}
            <div class="absolute right-0 mt-2 w-52 rounded-md border border-border bg-surface-elevated shadow-lg z-[100]">
              <div class="px-4 py-3 border-b border-border">
                <p class="text-sm font-medium text-foreground">{displayName}</p>
              </div>
              <div class="py-1 nav-li-font">
                {#if data.profile?.username}
                  <a 
                    href="/profile/{data.profile.username}" 
                    class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    data-sveltekit-prefetch
                    on:click={closeMenus}
                  >
                    View Profile
                  </a>
                {/if}
                <a 
                  href="/about" 
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  About
                </a>
                <a 
                  href="/help" 
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  Help
                </a>
                <a 
                  href="/profile/edit" 
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  Settings
                </a>
                <a 
                  href="/logout" 
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  on:click={closeMenus}
                >
                  Logout
                </a>
              </div>
            </div>
          {/if}
        </div>

        <!-- Mobile menu button -->
        <button 
          type="button" 
          class="inline-flex items-center rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:hidden" 
          aria-label="Open menu"
          on:click={toggleMobileMenu}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {#if mobileMenuOpen}
          <div class="absolute top-16 left-0 right-0 border-b border-border bg-surface-elevated shadow-lg z-[100] md:hidden" bind:this={mobileMenuElement}>
            <div class="px-4 py-3 border-b border-border">
              <p class="text-sm font-medium text-foreground">{displayName}</p>
            </div>
            <div class="py-1 nav-li-font">
              {#if data.profile?.username}
                <a 
                  href="/profile/{data.profile.username}" 
                  class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  data-sveltekit-prefetch
                  on:click={closeMenus}
                >
                  View Profile
                </a>
              {/if}
              <a 
                href="/profile/edit" 
                class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                data-sveltekit-prefetch
                on:click={closeMenus}
              >
                Settings
              </a>
              <a 
                href="/s" 
                class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                data-sveltekit-prefetch
                on:click={closeMenus}
              >
                Browse Boards
              </a>
              <a 
                href="/my-boards" 
                class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                data-sveltekit-prefetch
                on:click={closeMenus}
              >
                My Boards
              </a>
              <a 
                href="/logout" 
                class="block px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                on:click={closeMenus}
              >
                Logout
              </a>
            </div>
          </div>
        {/if}
      {:else}
        <a 
          href="/login" 
          class="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-alt border border-border"
          data-sveltekit-prefetch
        >
          Login / Sign Up
        </a>
      {/if}
    </div>
  </div>
</nav>

<slot />

<!-- Keep the footer for logged-in users only -->
{#if isAuthed}
  <footer class="w-full p-4 bg-surface border-t border-border mt-8">
    <div class="mx-auto text-center text-sm text-muted-foreground">
      <p>© {new Date().getFullYear()} QuiverShare — All rights reserved</p>
    </div>
  </footer>
{/if}
