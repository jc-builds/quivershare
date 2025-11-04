<script lang="ts">
  import { supabase } from "$lib/supabaseClient";
  import { goto } from "$app/navigation";
  export let data: { user: import('@supabase/supabase-js').User | null };

  async function login() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) console.error("OAuth error:", error);
  }

  function goBoards() {
    goto("/my-boards");
  }
</script>

<section class="flex flex-col items-center justify-start min-h-screen pt-56 text-center space-y-8">
  {#if data.user}
    <h1 class="text-3xl font-bold">You’re already signed in</h1>
    <a class="btn btn-primary px-6 py-3 text-lg rounded-lg" href="/my-boards">Go to My Boards</a>
  {:else}
    <h1 class="text-3xl font-bold">Sign in to QuiverShare</h1>
    <a class="btn btn-primary px-6 py-3 text-lg rounded-lg" href="/auth/start">Sign in with Google</a>
  {/if}
</section>
