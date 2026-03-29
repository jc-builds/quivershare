<script lang="ts">
  import { formatPrice } from '$lib/formatPrice';

  export let data: {
    featuredBoards: Array<{
      id: string;
      name: string;
      make: string | null;
      length: number | null;
      price: number | null;
      style: string | null;
      condition: string | null;
      city: string | null;
      region: string | null;
      image_url: string | null;
      is_curated?: boolean | null;
      owner_type?: string | null;
      shop_id?: string | null;
      shop_name?: string | null;
      shop_logo_url?: string | null;
    }>;
  };

  const placeholderThumbnail = 'https://via.placeholder.com/400x533?text=No+Image';

  function formatBoardTitle(board: { length: number | null; name: string }): string {
    if (board.length == null || Number.isNaN(board.length)) return board.name;
    const feet = Math.floor(board.length / 12);
    const inches = board.length % 12;
    return `${feet}'${inches}" ${board.name}`;
  }

  function displayStyle(style: string | null): string | null {
    if (!style) return null;
    return style === 'Groveler' ? 'Groveler / Fish' : style;
  }
</script>

<svelte:head>
  <title>Used Surfboard Marketplace | QuiverShare</title>
  <meta
    name="description"
    content="Buy and sell used surfboards in New York, New Jersey, and the East Coast on QuiverShare, the surfboard marketplace built for surfers."
  />
  <link rel="canonical" href="https://www.quivershare.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Used Surfboard Marketplace | QuiverShare" />
  <meta property="og:description" content="Buy and sell used surfboards in New York, New Jersey, and the East Coast on QuiverShare, the surfboard marketplace built for surfers." />
  <meta property="og:url" content="https://www.quivershare.com/" />
  <meta property="og:image" content="https://www.quivershare.com/og-logo-card.png" />
  <meta property="og:site_name" content="QuiverShare" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Used Surfboard Marketplace | QuiverShare" />
  <meta name="twitter:description" content="Buy and sell used surfboards in New York, New Jersey, and the East Coast on QuiverShare, the surfboard marketplace built for surfers." />
  <meta name="twitter:image" content="https://www.quivershare.com/og-logo-card.png" />
</svelte:head>

<main>
  <!-- Hero -->
  <section class="relative w-full overflow-hidden" aria-labelledby="hero-title">
    <div class="relative h-[50vh] min-h-[360px] md:h-[56vh] md:min-h-[440px] lg:h-[60vh]">
      <img
        src="/hero-boards.jpg"
        alt="Colorful surfboards lined up in a rack"
        class="absolute inset-0 w-full h-full object-cover object-[center_40%] md:object-[center_35%]"
        loading="eager"
        fetchpriority="high"
        decoding="sync"
      />
      <div class="absolute inset-0 flex items-end">
        <div class="w-full px-4 md:px-8 pb-8 md:pb-12 lg:max-w-6xl lg:mx-auto">
          <div class="max-w-lg bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl px-6 py-6 md:px-8 md:py-8 shadow-sm">
            <h1 id="hero-title" class="text-2xl md:text-3xl lg:text-4xl font-bold leading-[1.15] tracking-tight text-foreground">
              The surfboard marketplace for New York &amp; New Jersey
            </h1>
            <p class="mt-3 text-sm md:text-base text-foreground/70 leading-relaxed">
              Find boards near you, list your own, or manage inventory for your surf shop.
            </p>
            <div class="flex flex-wrap gap-3 mt-5">
              <a
                href="/s"
                class="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-alt"
                data-sveltekit-prefetch
              >
                Browse boards
              </a>
              <a
                href="/create-surfboard"
                class="inline-flex items-center justify-center rounded-lg border border-border bg-white/80 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white"
                data-sveltekit-prefetch
              >
                List a board
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Inventory -->
  {#if data.featuredBoards.length > 0}
    <section class="bg-background pt-10 pb-8 md:pt-14 md:pb-10" aria-labelledby="inventory-title">
      <div class="max-w-7xl mx-auto px-4 md:px-8">
        <div class="flex items-baseline justify-between mb-6">
          <h2 id="inventory-title" class="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            Boards near New York &amp; New Jersey
          </h2>
          <a
            href="/s"
            class="text-sm font-medium text-primary hover:text-primary-alt transition-colors whitespace-nowrap"
            data-sveltekit-prefetch
          >
            View all &rarr;
          </a>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {#each data.featuredBoards as board, index (board.id)}
            <a
              href="/surfboards/{board.id}"
              data-sveltekit-prefetch
              class="group flex flex-col bg-surface rounded-xl border border-border hover:shadow-md transition-all duration-200 no-underline"
            >
              <div class="relative bg-muted rounded-t-xl overflow-hidden aspect-[3/4]">
                {#if board.image_url}
                  <img
                    src={board.image_url}
                    alt={board.name}
                    class="absolute inset-0 w-full h-full object-cover"
                    loading={index < 2 ? 'eager' : 'lazy'}
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

              <div class="flex flex-col flex-1 px-3 pt-3 pb-2.5 md:px-4 md:pt-3.5 md:pb-3">
                <h3 class="text-sm md:text-base font-semibold text-foreground leading-snug line-clamp-2">{formatBoardTitle(board)}</h3>
                {#if board.make || board.style}
                  <p class="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {[board.make, displayStyle(board.style)].filter(Boolean).join(' · ')}
                  </p>
                {/if}
                <div class="flex items-end justify-between gap-2 mt-auto pt-1.5">
                  {#if board.price}
                    <span class="text-base font-bold text-primary leading-none">{formatPrice(board.price)}</span>
                  {:else}
                    <span></span>
                  {/if}
                  {#if board.owner_type === 'shop' && board.shop_name}
                    <div class="flex items-center gap-1 min-w-0 flex-shrink">
                      {#if board.shop_logo_url}
                        <img src={board.shop_logo_url} alt="" class="w-4 h-4 rounded object-cover flex-shrink-0" />
                      {/if}
                      <span class="text-[11px] text-muted-foreground truncate">{board.shop_name}</span>
                    </div>
                  {:else if board.owner_type === 'curated' || board.is_curated}
                    <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Curated</span>
                  {/if}
                </div>
              </div>
            </a>
          {/each}
        </div>

        <div class="mt-6 text-center">
          <a
            href="/s"
            class="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            data-sveltekit-prefetch
          >
            Browse all boards
          </a>
        </div>
      </div>
    </section>
  {/if}

  <!-- Entry Points -->
  <section class="bg-muted py-12 md:py-16" aria-labelledby="entry-points-title">
    <div class="max-w-5xl mx-auto px-4 md:px-8">
      <h2 id="entry-points-title" class="text-lg md:text-xl font-semibold tracking-tight text-foreground mb-6">
        Browse, sell, or run your shop
      </h2>
      <div class="grid gap-4 md:grid-cols-3 md:gap-5">
        <a
          href="/s"
          class="group flex flex-col rounded-xl border border-border bg-surface px-5 py-5 md:px-6 md:py-6 transition-all duration-200 hover:shadow-md no-underline"
          data-sveltekit-prefetch
        >
          <h3 class="text-base font-semibold text-foreground">Browse boards</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
            Explore used surfboards from surfers and shops across New York and New Jersey.
          </p>
          <span class="mt-4 text-sm font-medium text-primary group-hover:text-primary-alt transition-colors">
            Browse boards &rarr;
          </span>
        </a>
        <a
          href="/create-surfboard"
          class="group flex flex-col rounded-xl border border-border bg-surface px-5 py-5 md:px-6 md:py-6 transition-all duration-200 hover:shadow-md no-underline"
          data-sveltekit-prefetch
        >
          <h3 class="text-base font-semibold text-foreground">List a board</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
            Post your board with photos and details, and connect with local buyers.
          </p>
          <span class="mt-4 text-sm font-medium text-primary group-hover:text-primary-alt transition-colors">
            List a board &rarr;
          </span>
        </a>
        <a
          href="/shops/new"
          class="group flex flex-col rounded-xl border border-border bg-surface px-5 py-5 md:px-6 md:py-6 transition-all duration-200 hover:shadow-md no-underline"
          data-sveltekit-prefetch
        >
          <h3 class="text-base font-semibold text-foreground">Create your shop</h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
            Set up a shop page and manage your board inventory in one place.
          </p>
          <span class="mt-4 text-sm font-medium text-primary group-hover:text-primary-alt transition-colors">
            Create your shop &rarr;
          </span>
        </a>
      </div>
    </div>
  </section>
</main>
