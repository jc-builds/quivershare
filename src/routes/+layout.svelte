<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import "../app.css";

  export let data: {
    session: import('@supabase/supabase-js').Session | null;
    user: import('@supabase/supabase-js').User | null;
    profile: { username: string | null } | null;
  };

  const isAuthed = !!data.session;

  const displayName =
    data.profile?.username
      ?? data.user?.user_metadata?.preferred_username
      ?? data.user?.user_metadata?.name
      ?? 'User';
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- Header -->
<nav class="navbar bg-base-100 shadow mb-6">
  <!-- Left: Brand -->
  <div class="flex-1">
    <a href="/" class="btn btn-ghost text-xl" data-sveltekit-prefetch>QuiverShare</a>
  </div>

  <!-- Right: Only render if logged in -->
  {#if isAuthed}
    <div class="flex-none">
      <!-- Mobile menu -->
      <div class="dropdown dropdown-end md:hidden">
        <label tabindex="0" class="btn btn-ghost" aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </label>
        <ul tabindex="0" class="menu menu-sm dropdown-content bg-base-100 rounded-box shadow mt-3 w-52 right-0 z-10">
          <li class="menu-title"><span>{displayName}</span></li>
          {#if data.profile?.username}
            <li><a href="/profile/{data.profile.username}" data-sveltekit-prefetch>My Profile</a></li>
          {/if}
          <li><a href="/create-surfboard" data-sveltekit-prefetch>Add Surfboard</a></li>
          <li><a href="/my-boards" data-sveltekit-prefetch>My Boards</a></li>
          <li><a href="/logout">Logout</a></li>
        </ul>
      </div>

      <!-- Desktop menu -->
      <ul class="menu menu-horizontal px-1 hidden md:flex items-center gap-1">
        {#if data.profile?.username}
          <li>
            <a href="/profile/{data.profile.username}" data-sveltekit-prefetch class="btn btn-ghost btn-sm">
              Profile
            </a>
          </li>
        {/if}
        <li><a href="/create-surfboard" data-sveltekit-prefetch>Add Surfboard</a></li>
        <li><a href="/my-boards" data-sveltekit-prefetch>My Boards</a></li>
        <li class="px-2">
          <span class="badge badge-outline">{displayName}</span>
        </li>
        <li><a href="/logout" class="btn btn-sm">Logout</a></li>
      </ul>
    </div>
  {/if}
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
