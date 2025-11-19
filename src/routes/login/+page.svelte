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

<section class="min-h-screen bg-background text-foreground flex flex-col items-center justify-center text-center px-4 py-24 space-y-6">
  {#if data.user}
    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">You're already signed in</h1>
    <a 
      class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background" 
      href="/my-boards"
    >
      Go to My Boards
    </a>
  {:else}
    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">Sign in to QuiverShare</h1>
    <a 
      class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background" 
      href="/auth/start"
    >
      Sign in with Google
    </a>
  {/if}
</section>
