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
<footer class="w-full bg-surface border-t border-border mt-12">
  <div class="mx-auto lg:max-w-6xl px-4 md:px-8 py-6 text-center space-y-2">
    <p class="text-sm text-muted-foreground">
      © {new Date().getFullYear()} QuiverShare — Built by surfers, for surfers.
    </p>

    <p class="text-sm text-muted-foreground">
      Contact:
      <a
        href="mailto:support@quivershare.com"
        class="hover:text-foreground underline"
      >
        info@quivershare.com
      </a>
    </p>

    <div
      class="flex items-center justify-center gap-4 text-sm text-muted-foreground"
    >
      <a href="/terms" class="hover:text-foreground underline"
        >Terms of Service</a
      >
      <a href="/privacy" class="hover:text-foreground underline"
        >Privacy Policy</a
      >
    </div>
  </div>
</footer>
