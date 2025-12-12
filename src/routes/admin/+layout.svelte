<!-- src/routes/admin/+layout.svelte -->
<script lang="ts">
  // Profile data is available from parent layout if needed
</script>

<div class="min-h-screen bg-background">
  <div class="border-b border-border bg-surface-elevated">
    <div class="mx-auto max-w-6xl px-4 md:px-8 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-foreground">Admin</h1>
        <nav class="flex items-center gap-4 text-sm">
          <a
            href="/admin/curated-boards"
            class="text-muted-foreground hover:text-foreground transition-colors"
            data-sveltekit-prefetch
          >
            Curated Boards
          </a>
        </nav>
      </div>
    </div>
  </div>

  <div class="mx-auto max-w-6xl px-4 md:px-8 py-6">
    <slot />
  </div>
</div>

