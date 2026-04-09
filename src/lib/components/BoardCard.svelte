<script lang="ts">
  import { formatPrice } from '$lib/formatPrice';

  export let board: {
    id: string;
    name: string;
    make: string | null;
    length: number | null;
    price: number | null;
    image_url: string | null;
    owner_type?: string | null;
    is_curated?: boolean | null;
    shop_name?: string | null;
    shop_logo_url?: string | null;
  };

  export let eager: boolean = false;
  export let showAttribution: boolean = false;

  function formatTitle(b: { name: string; length: number | null }): string {
    if (b.length == null || Number.isNaN(b.length)) return b.name;
    const feet = Math.floor(b.length / 12);
    const inches = b.length % 12;
    return `${feet}'${inches}" ${b.name}`;
  }
</script>

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
        loading={eager ? 'eager' : 'lazy'}
        fetchpriority={eager ? 'high' : undefined}
        decoding="async"
      />
    {:else}
      <img
        src="/no-image.svg"
        alt=""
        class="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
    {/if}
  </div>

  <div class="flex flex-col flex-1 px-3 pt-3 pb-2.5 md:px-4 md:pt-3.5 md:pb-3">
    <h3 class="text-sm md:text-base font-semibold text-foreground leading-snug line-clamp-2">{formatTitle(board)}</h3>
    {#if board.make}
      <p class="text-xs text-muted-foreground mt-1 line-clamp-1">{board.make}</p>
    {/if}
    <div class="flex items-end justify-between gap-2 mt-auto pt-1.5">
      {#if board.price}
        <span class="text-base font-bold text-foreground leading-none">{formatPrice(board.price)}</span>
      {:else}
        <span></span>
      {/if}
      {#if showAttribution}
        {#if board.owner_type === 'shop' && board.shop_name}
          {#if board.shop_logo_url}
            <img src={board.shop_logo_url} alt={board.shop_name} class="w-4 h-4 rounded object-cover flex-shrink-0" />
          {:else}
            <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Shop</span>
          {/if}
        {:else if board.owner_type === 'curated' || board.is_curated}
          <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Curated</span>
        {/if}
      {/if}
    </div>
  </div>
</a>
