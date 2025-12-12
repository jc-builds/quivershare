<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Client-side redirect fallback in case server redirect doesn't happen immediately
  onMount(() => {
    goto('/admin/curated-boards');
  });
</script>

<div class="min-h-screen bg-background flex items-center justify-center">
  <p class="text-muted-foreground">Redirecting...</p>
</div>

