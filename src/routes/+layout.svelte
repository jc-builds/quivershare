<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<!-- Shared Header -->
<nav class="navbar bg-base-100 shadow mb-6">
  <div class="flex-1">
    <a href="/" class="btn btn-ghost text-xl">QuiverShare</a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1">
      <li><a href="/edit-surfboard">Edit Surfboard</a></li>
      <li><a href="/profile">My Profile</a></li>
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
