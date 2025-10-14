<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";
  import "../app.css";
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- Shared Header -->
<nav class="navbar bg-base-100 shadow mb-6">
  <!-- Left: Brand -->
  <div class="flex-1">
    <a href="/" class="btn btn-ghost text-xl">QuiverShare</a>
  </div>

  <!-- Right: Menu -->
  <div class="flex-none">
    <div class="dropdown dropdown-end md:hidden">
      <label tabindex="0" class="btn btn-ghost">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          /></svg
        >
      </label>
      <ul
        tabindex="0"
        class="menu menu-sm dropdown-content bg-base-100 rounded-box shadow mt-3 w-52 right-0 z-10"
      >
        <li><a href="/create-surfboard">Add Surfboard</a></li>
        <li><a href="/my-boards">My Boards</a></li>
      </ul>
    </div>

    <!-- Desktop Menu -->
    <ul class="menu menu-horizontal px-1 hidden md:flex">
      <li><a href="/create-surfboard">Add Surfboard</a></li>
      <li><a href="/my-boards">My Boards</a></li>
    </ul>
  </div>
</nav>

<!-- Page content -->
<slot />

<!-- Shared Footer -->
<footer class="footer footer-center p-4 bg-base-200 text-base-content mt-8">
  <aside>
    <p>© {new Date().getFullYear()} QuiverShare — All rights reserved</p>
  </aside>
</footer>
