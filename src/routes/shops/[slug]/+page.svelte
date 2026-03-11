<script lang="ts">
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
  };

  const placeholderThumbnail = 'https://via.placeholder.com/400x300?text=No+Image';

  function formatBoardTitle(board: { name: string; length: number | null }): string {
    if (board.length == null || Number.isNaN(board.length)) return board.name;
    const feet = Math.floor(board.length / 12);
    const inches = board.length % 12;
    return `${board.name} — ${feet}'${inches}"`;
  }

  function displayStyle(style: string | null): string | null {
    if (!style) return null;
    return style === 'Groveler' ? 'Groveler / Fish' : style;
  }

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
    <div class="flex items-start gap-5 mb-8">
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
        <p class="text-sm text-muted-foreground">No boards listed yet.</p>
      {:else}
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {#each data.boards as board (board.id)}
            <a
              href="/surfboards/{board.id}"
              data-sveltekit-prefetch
              class="block bg-surface-elevated/80 rounded-xl border border-border hover:border-primary/60 hover:shadow-lg transition-all duration-200 no-underline"
            >
              <div class="relative bg-muted rounded-t-xl overflow-hidden aspect-[3/4]">
                {#if board.image_url}
                  <img
                    src={board.image_url}
                    alt={board.name}
                    class="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                {:else}
                  <img
                    src={placeholderThumbnail}
                    alt=""
                    class="absolute inset-0 w-full h-full object-cover"
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                  />
                {/if}
              </div>
              <div class="p-3 md:p-4">
                <h3 class="text-base md:text-lg font-semibold text-foreground leading-tight line-clamp-2">{formatBoardTitle(board)}</h3>
                {#if board.make}
                  <p class="text-sm text-muted-foreground mt-1 line-clamp-1">{board.make}</p>
                {/if}
                {#if board.style}
                  <p class="text-sm text-muted-foreground mt-1">{displayStyle(board.style)}</p>
                {/if}
                {#if board.price}
                  <p class="text-base font-semibold text-primary mt-2">${board.price}</p>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</main>
