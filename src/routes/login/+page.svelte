<script lang="ts">
  import { pageTitle } from '$lib/title';

  export let data: { 
    user: import('@supabase/supabase-js').User | null;
    profile: { username: string | null; profile_picture_url: string | null; is_deleted?: boolean | null } | null;
  };

  const isActiveUser = !!(
    data.user &&
    data.profile &&
    data.profile.is_deleted !== true
  );
</script>

<svelte:head>
  <title>{pageTitle('Sign In')}</title>
</svelte:head>

<section class="min-h-screen bg-background text-foreground flex flex-col items-center justify-center text-center px-4 py-24 space-y-6">
  {#if isActiveUser}
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
