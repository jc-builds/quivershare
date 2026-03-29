<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { browser } from "$app/environment";
  import { page } from "$app/stores";
  import { PUBLIC_ENV } from "$env/static/public";
  import "../app.css";
  import Header from "$lib/components/Header.svelte";

  export let data: {
    session: import("@supabase/supabase-js").Session | null;
    user: import("@supabase/supabase-js").User | null;
    profile: {
      username: string | null;
      profile_picture_url: string | null;
      is_deleted?: boolean | null;
    } | null;
    shopSlug: string | null;
  };

  const isActiveUser = !!(
    data.user &&
    data.profile &&
    data.profile.is_deleted !== true
  );

  const displayName =
    data.profile?.username ??
    data.user?.user_metadata?.preferred_username ??
    data.user?.user_metadata?.name ??
    "User";

  $: isStagingHost = $page.url.hostname === "staging.quivershare.com";
</script>

<svelte:head>
  <title>QuiverShare</title>
  {#if isStagingHost}
    <meta name="robots" content="noindex, nofollow" />
  {/if}

  {#if browser && PUBLIC_ENV === "production"}
    <!-- Google Tag Manager -->
    <script>
      (function (w, d, s, l, i) {
        w[l] = w[l] || [];
        w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != "dataLayer" ? "&l=" + l : "";
        j.async = true;
        j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
        f.parentNode.insertBefore(j, f);
      })(window, document, "script", "dataLayer", "GTM-PWVWHL3H");
    </script>
    <!-- End Google Tag Manager -->
  {/if}
</svelte:head>

<!-- Google Tag Manager -->
{#if PUBLIC_ENV === "production"}
  <!-- Google Tag Manager (noscript) -->
  <noscript>
    <iframe
      src="https://www.googletagmanager.com/ns.html?id=GTM-PWVWHL3H"
      height="0"
      width="0"
      style="display:none;visibility:hidden"
      title="Google Tag Manager"
    >
    </iframe>
  </noscript>
  <!-- End Google Tag Manager (noscript) -->
{/if}

<Header
  {isActiveUser}
  shopSlug={data.shopSlug}
  username={data.profile?.username ?? null}
  profileImageUrl={data.profile?.profile_picture_url ?? null}
  {displayName}
/>

<slot />

<!-- Global Footer -->
<footer class="w-full border-t border-border bg-background mt-0">
  <div class="mx-auto lg:max-w-6xl px-4 md:px-8 py-10 md:py-12">
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
      <div class="text-sm text-foreground font-semibold tracking-tight">
        QuiverShare
        <p class="mt-1 text-xs font-normal text-muted-foreground">Built by surfers, for surfers.</p>
      </div>
      <nav class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <a href="/s" class="hover:text-foreground transition-colors">Browse</a>
        <a href="/about" class="hover:text-foreground transition-colors">About</a>
        <a href="/help" class="hover:text-foreground transition-colors">Help</a>
        <a href="/terms" class="hover:text-foreground transition-colors">Terms</a>
        <a href="/privacy" class="hover:text-foreground transition-colors">Privacy</a>
      </nav>
    </div>
    <div class="mt-8 pt-5 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
      <p>&copy; {new Date().getFullYear()} QuiverShare</p>
      <a href="mailto:info@quivershare.com" class="hover:text-foreground transition-colors">info@quivershare.com</a>
    </div>
  </div>
</footer>
