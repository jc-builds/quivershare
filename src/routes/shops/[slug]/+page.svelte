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

  $: hasContactInfo = !!(data.shop.website_url || data.shop.email || data.shop.phone);
</script>

<svelte:head>
  <title>{data.shop.name} — QuiverShare</title>
</svelte:head>

<main class="min-h-screen bg-background">

  <!-- ─── Banner Stage ─── -->
  <div class="bg-[#4a4a58]">
    <div class="mx-auto lg:max-w-6xl px-4 md:px-8 py-5 md:py-6">
      {#if data.shop.banner_image_url}
        <div class="mx-auto max-w-3xl aspect-[3/1] md:aspect-[5/1] rounded-lg overflow-hidden shadow-sm">
          <img
            src={data.shop.banner_image_url}
            alt="{data.shop.name} banner"
            class="w-full h-full object-cover"
          />
        </div>
      {/if}
    </div>
  </div>

  <!-- ─── Shop Identity ─── -->
  <header class="border-b border-border bg-background">
    <div class="mx-auto lg:max-w-6xl px-4 md:px-8">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 py-5 md:py-6">
        <div class="flex items-end gap-4 md:gap-5">
          {#if data.shop.logo_image_url}
            <img
              src={data.shop.logo_image_url}
              alt="{data.shop.name} logo"
              class="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border border-border shadow-md flex-shrink-0 -mt-12 md:-mt-14"
            />
          {/if}
          <div class="min-w-0">
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">{data.shop.name}</h1>
            {#if locationDisplay(data.shop)}
              <p class="text-sm text-muted-foreground mt-0.5">{locationDisplay(data.shop)}</p>
            {/if}
          </div>
        </div>

        {#if data.isOwnerOrAdmin}
          <div class="flex items-center gap-2 flex-shrink-0">
            <a
              href="/shops/{data.shop.slug}/edit"
              class="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-sm font-medium text-foreground border border-border bg-surface hover:bg-muted transition-colors"
            >
              Edit Shop
            </a>
            <a
              href="/shops/{data.shop.slug}/dashboard"
              class="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-sm font-medium text-foreground border border-border bg-surface hover:bg-muted transition-colors"
            >
              Shop Dashboard
            </a>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <!-- ─── Shop Overview ─── -->
  {#if data.shop.description || hasContactInfo}
    <section class="bg-surface border-y border-border">
      <div class="mx-auto lg:max-w-6xl px-4 md:px-8 py-8 md:py-10">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {#if data.shop.description}
            <div class="{hasContactInfo ? 'md:col-span-2' : 'md:col-span-3'}">
              <p class="text-[15px] text-foreground leading-relaxed whitespace-pre-line">{data.shop.description}</p>
            </div>
          {/if}

          {#if hasContactInfo}
            <div class="space-y-3.5">
              {#if data.shop.website_url}
                <div class="flex items-start gap-2.5">
                  <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground w-16 flex-shrink-0 pt-0.5">Web</span>
                  <a
                    href={data.shop.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm font-medium text-foreground hover:text-primary transition-colors break-all leading-snug"
                  >
                    {data.shop.website_url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              {/if}
              {#if data.shop.email}
                <div class="flex items-start gap-2.5">
                  <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground w-16 flex-shrink-0 pt-0.5">Email</span>
                  <a href="mailto:{data.shop.email}" class="text-sm text-foreground hover:text-primary transition-colors leading-snug">
                    {data.shop.email}
                  </a>
                </div>
              {/if}
              {#if data.shop.phone}
                <div class="flex items-start gap-2.5">
                  <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground w-16 flex-shrink-0 pt-0.5">Phone</span>
                  <a href="tel:{data.shop.phone}" class="text-sm text-foreground hover:text-primary transition-colors leading-snug">
                    {data.shop.phone}
                  </a>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  <!-- ─── Inventory ─── -->
  <section class="mx-auto lg:max-w-6xl px-4 md:px-8 pt-8 md:pt-10 pb-10 md:pb-14">
    <div class="flex items-baseline justify-between mb-6">
      <h2 class="text-lg md:text-xl font-semibold tracking-tight text-foreground">
        {data.shop.name}&rsquo;s Boards
        {#if data.boards.length > 0}
          <span class="text-muted-foreground font-normal text-sm ml-1">({data.boards.length})</span>
        {/if}
      </h2>
      {#if data.isOwnerOrAdmin && data.boards.length > 0}
        <a
          href="/shops/{data.shop.slug}/dashboard/new"
          class="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
        >
          + Add board
        </a>
      {/if}
    </div>

    {#if data.boards.length === 0}
      <div class="rounded-xl border border-border bg-surface p-10 md:p-14 text-center">
        {#if data.isOwnerOrAdmin}
          <p class="text-foreground font-medium">Your shop doesn&rsquo;t have any boards yet.</p>
          <p class="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Add your first listing from the Shop Dashboard to start showing boards here.</p>
          <a
            href="/shops/{data.shop.slug}/dashboard/new"
            class="inline-flex items-center justify-center mt-5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
          >
            + Add Your First Board
          </a>
        {:else}
          <p class="text-muted-foreground">{data.shop.name} hasn&rsquo;t listed any boards yet. Check back soon.</p>
          {#if data.shop.website_url}
            <a
              href={data.shop.website_url}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-block mt-3 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Visit {data.shop.name}&rsquo;s website &rarr;
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
  </section>
</main>
