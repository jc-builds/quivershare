<script lang="ts">
  import BoardCard from '$lib/components/BoardCard.svelte';

  export let data: {
    shop: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      website_url: string | null;
      email: string | null;
      phone: string | null;
      location_label: string | null;
      city: string | null;
      region: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
      logo_image_url: string | null;
      banner_image_url: string | null;
    };
    boards: Array<{
      id: string;
      name: string;
      make: string | null;
      length: number | null;
      price: number | null;
      style: string | null;
      image_url: string | null;
    }>;
    isOwnerOrAdmin?: boolean;
  };

  function locationDisplay(shop: typeof data.shop): string | null {
    if (shop.location_label) return shop.location_label;
    const parts = [shop.city, shop.region].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }
</script>

<svelte:head>
  <title>{data.shop.name} — QuiverShare</title>
</svelte:head>

<main class="min-h-screen bg-background">
  <!-- Banner -->
  {#if data.shop.banner_image_url}
    <div class="w-full h-48 sm:h-64 bg-muted overflow-hidden">
      <img
        src={data.shop.banner_image_url}
        alt="{data.shop.name} banner"
        class="w-full h-full object-cover"
      />
    </div>
  {/if}

  <div class="mx-auto lg:max-w-6xl px-4 md:px-8 py-8">
    <!-- Shop Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 {data.isOwnerOrAdmin ? 'pb-6 border-b border-border' : ''}">
      <div class="flex items-start gap-5">
        {#if data.shop.logo_image_url}
          <img
            src={data.shop.logo_image_url}
            alt="{data.shop.name} logo"
            class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-border shadow-sm flex-shrink-0 {data.shop.banner_image_url ? '-mt-12 sm:-mt-16 ring-4 ring-background' : ''}"
          />
        {/if}
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{data.shop.name}</h1>
          {#if locationDisplay(data.shop)}
            <p class="text-sm text-muted-foreground mt-1">{locationDisplay(data.shop)}</p>
          {/if}
        </div>
      </div>
      {#if data.isOwnerOrAdmin}
        <div class="flex items-center gap-3 flex-shrink-0">
          <a
            href="/shops/{data.shop.slug}/edit"
            class="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-elevated text-foreground border border-border hover:bg-muted transition-colors"
          >
            Edit Shop
          </a>
          <a
            href="/shops/{data.shop.slug}/dashboard"
            class="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
          >
            Shop Dashboard
          </a>
        </div>
      {/if}
    </div>

    <!-- Shop Details -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
      <div class="md:col-span-2 space-y-4">
        {#if data.shop.description}
          <p class="text-sm text-foreground leading-relaxed whitespace-pre-line">{data.shop.description}</p>
        {/if}
      </div>
      <div class="space-y-3 text-sm">
        {#if data.shop.website_url}
          <div>
            <span class="block text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Website</span>
            <a href={data.shop.website_url} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">
              {data.shop.website_url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        {/if}
        {#if data.shop.email}
          <div>
            <span class="block text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Email</span>
            <a href="mailto:{data.shop.email}" class="text-primary hover:underline">{data.shop.email}</a>
          </div>
        {/if}
        {#if data.shop.phone}
          <div>
            <span class="block text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Phone</span>
            <a href="tel:{data.shop.phone}" class="text-foreground hover:text-primary">{data.shop.phone}</a>
          </div>
        {/if}
      </div>
    </div>

    <!-- Listings -->
    <div>
      <h2 class="text-lg font-semibold text-foreground mb-4">
        Boards
        {#if data.boards.length > 0}
          <span class="text-muted-foreground font-normal text-sm ml-1">({data.boards.length})</span>
        {/if}
      </h2>

      {#if data.boards.length === 0}
        <div class="rounded-xl border border-border bg-surface p-8 text-center">
          {#if data.isOwnerOrAdmin}
            <p class="text-foreground font-medium">Your shop doesn't have any boards yet.</p>
            <p class="text-sm text-muted-foreground mt-2">Add your first listing from the Shop Dashboard to start showing boards here.</p>
            <a
              href="/shops/{data.shop.slug}/dashboard/new"
              class="inline-flex items-center justify-center mt-4 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
            >
              + Add Your First Board
            </a>
          {:else}
            <p class="text-muted-foreground">{data.shop.name} hasn't listed any boards yet. Check back soon.</p>
            {#if data.shop.website_url}
              <a
                href={data.shop.website_url}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block mt-3 text-sm text-primary hover:underline"
              >
                Visit {data.shop.name}'s website
              </a>
            {/if}
          {/if}
        </div>
      {:else}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {#each data.boards as board (board.id)}
            <BoardCard {board} />
          {/each}
        </div>
      {/if}
    </div>
  </div>
</main>
