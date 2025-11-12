<!-- src/routes/+layout.svelte -->
<script lang="ts">
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
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- Header -->
<nav class="navbar bg-base-100 bg-opacity-90 backdrop-blur-md sticky top-0 z-50 shadow mb-0 overflow-visible py-3 px-0">
  <div class="w-full max-w-8xl mx-auto px-2 md:px-6">
    <div class="flex items-center justify-between">
      <!-- Left: Brand -->
      <div class="flex-1">
        <a href="/" class="btn btn-ghost text-xl" data-sveltekit-prefetch>QuiverShare</a>
      </div>

      <!-- Right controls -->
      <div class="flex-none overflow-visible">
        {#if isAuthed}
          <!-- Mobile menu -->
          <div class="dropdown dropdown-end md:hidden">
            <button type="button" class="btn btn-ghost" aria-label="Open menu">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <ul class="menu menu-sm dropdown-content bg-base-100 rounded-box shadow mt-3 w-52 right-0 z-10 nav-li-font">
              <li class="menu-title"><span>{displayName}</span></li>
              {#if data.profile?.username}
                <li><a href="/profile/{data.profile.username}" data-sveltekit-prefetch>View Profile</a></li>
              {/if}
              <li><a href="/profile/edit" data-sveltekit-prefetch>Settings</a></li>
              <li><a href="/s" data-sveltekit-prefetch>Browse Boards</a></li>
              <li><a href="/my-boards" data-sveltekit-prefetch>My Boards</a></li>
              <li><a href="/logout">Logout</a></li>
            </ul>
          </div>

          <!-- Desktop menu -->
          <ul class="menu menu-horizontal hidden md:flex items-center px-1 gap-[0.3125rem] nav-li-font">
            <li><a href="/s" data-sveltekit-prefetch>Browse Boards</a></li>
            <li><a href="/my-boards" data-sveltekit-prefetch>My Boards</a></li>
            <li>
              <div class="dropdown dropdown-end dropdown-bottom">
                <button type="button" class="btn btn-ghost btn-sm p-0" aria-label="Open profile menu">
                  {#if profileImageUrl}
                    <img
                      src={profileImageUrl}
                      alt={`Profile picture of ${displayName}`}
                      class="w-8 h-8 rounded-full object-cover"
                    />
                  {:else}
                    <span
                      class="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center text-sm nav-li-font"
                      aria-hidden="true"
                    >
                      {initials}
                    </span>
                    <span class="sr-only">Profile menu</span>
                  {/if}
                </button>
                <ul class="menu menu-sm dropdown-content bg-base-100 rounded-box shadow-lg mt-1 w-52 z-[100] nav-li-font">
                  <li class="menu-title"><span>{displayName}</span></li>
                  {#if data.profile?.username}
                    <li><a href="/profile/{data.profile.username}" data-sveltekit-prefetch>View Profile</a></li>
                  {/if}
                  <li><a href="/about" data-sveltekit-prefetch>About</a></li>
                  <li><a href="/help" data-sveltekit-prefetch>Help</a></li>
                  <li><a href="/profile/edit" data-sveltekit-prefetch>Settings</a></li>
                  <li><a href="/logout">Logout</a></li>
                </ul>
              </div>
            </li>
          </ul>
        {:else}
          <ul class="menu menu-horizontal hidden md:flex items-center px-1 gap-[0.3125rem] nav-li-font">
            <li>
              <a href="/s" data-sveltekit-prefetch>
                Browse Boards
              </a>
            </li>
            <li>
              <a href="/help" data-sveltekit-prefetch>
                Help
              </a>
            </li>
            <li>
              <a href="/about" data-sveltekit-prefetch>
                About
              </a>
            </li>
            <li class="text-primary font-medium hover:text-primary-focus">
              <a href="/login" data-sveltekit-prefetch>
                Login / Sign Up
              </a>
            </li>
          </ul>
        {/if}
      </div>
    </div>
  </div>
</nav>

<slot />

<!-- Keep the footer for logged-in users only -->
{#if isAuthed}
  <footer class="footer footer-center p-4 bg-base-200 text-base-content mt-8">
    <aside>
      <p>© {new Date().getFullYear()} QuiverShare — All rights reserved</p>
    </aside>
  </footer>
{/if}
