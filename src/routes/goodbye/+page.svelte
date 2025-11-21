<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // Redirect to home after 5 seconds
    const timer = setTimeout(() => {
      goto('/');
    }, 5000);
    return () => clearTimeout(timer);
  });
</script>

<section class="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-4 py-12 text-center">
  <div class="max-w-md mx-auto space-y-6">
    <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">
      Account Deleted
    </h1>
    <p class="text-base text-muted-foreground">
      Your account has been deleted. Thanks for being part of QuiverShare.
    </p>
    <p class="text-sm text-muted-foreground">
      You will be redirected to the homepage in a few seconds.
    </p>
    <a
      href="/"
      class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-base font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      Go to Homepage
    </a>
  </div>
</section>

