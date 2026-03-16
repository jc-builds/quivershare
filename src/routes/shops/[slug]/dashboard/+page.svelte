<script lang="ts">
  import { goto } from '$app/navigation';

  export let data;
  export let form;

  type Board = {
    id: string;
    name: string;
    image_url?: string;
    created_at?: string;
    state?: 'active' | 'inactive';
    price?: number | null;
    city?: string;
    region?: string;
  };

  $: boards = (data.boards ?? []) as Board[];
  $: shop = data.shop;
  $: currentStatus = (data as any).status ?? 'active';
  $: errorMessage = data.errorMessage ?? '';

  $: if (form?.context === 'updateState' && form?.success === false) {
    errorMessage = form.message || 'Action failed';
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
  }

  function formatPrice(price: number | null | undefined): string {
    if (price == null) return '—';
    return `$${price}`;
  }

  function viewBoard(boardId: string) {
    goto(`/surfboards/${boardId}`);
  }
</script>

<svelte:head>
  <title>{shop.name} — Dashboard — QuiverShare</title>
</svelte:head>

<section class="min-h-screen bg-background text-foreground px-4 sm:px-6 xl:px-8 py-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 text-center sm:text-left gap-4">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-foreground">{shop.name}</h1>
      <p class="text-sm text-muted-foreground mt-1">Shop Inventory</p>
    </div>
    <div class="flex items-center gap-3">
      <select
        class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        value={currentStatus}
        on:change={(e) => goto(`/shops/${shop.slug}/dashboard?status=${e.currentTarget.value}`)}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="all">All</option>
      </select>
      <a
        href="/shops/{shop.slug}/edit"
        class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors shadow-sm"
      >
        Shop Settings
      </a>
      <a
        href="/shops/{shop.slug}"
        class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors shadow-sm"
      >
        View Shop
      </a>
      <a
        href="/shops/{shop.slug}/dashboard/new"
        class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
      >
        + Add Board
      </a>
    </div>
  </div>

  {#if errorMessage}
    <p class="text-center text-red-400 mb-4">Error: {errorMessage}</p>
  {/if}

  {#if boards.length === 0 && !errorMessage}
    <div class="text-center py-16 space-y-4">
      <p class="text-lg font-medium text-foreground">Your inventory is empty</p>
      <p class="text-sm text-muted-foreground max-w-md mx-auto">
        Add your first board to start building your shop inventory.
      </p>
      <a
        href="/shops/{shop.slug}/dashboard/new"
        class="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
      >
        + Add Your First Board
      </a>
    </div>
  {:else}
    <!-- Mobile Card Layout -->
    <div class="block md:hidden space-y-4">
      {#each boards as board}
        <div class="bg-surface-elevated border border-border rounded-xl overflow-hidden">
          <div class="w-full aspect-[3/4] max-h-[350px] bg-surface overflow-hidden">
            <img
              src={board.image_url ?? "https://via.placeholder.com/800x600?text=No+Image"}
              alt={board.name}
              class="object-cover w-full h-full"
              loading="lazy"
              on:error={(e) => ((e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/800x600?text=No+Image")}
            />
          </div>

          <div class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-semibold text-foreground text-lg flex-1">{board.name}</h3>
              {#if board.state === 'active'}
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-primary-foreground whitespace-nowrap">active</span>
              {:else}
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface text-muted-foreground border border-border whitespace-nowrap">{board.state ?? 'unknown'}</span>
              {/if}
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <div>Created: {formatDate(board.created_at)}</div>
              <div>Price: <span class="text-foreground font-medium">{formatPrice(board.price)}</span></div>
              {#if board.city || board.region}
                <div class="col-span-2">{board.city}{board.city && board.region ? ', ' : ''}{board.region}</div>
              {/if}
            </div>

            <div class="flex gap-2 pt-1">
              <a
                href="/shops/{shop.slug}/dashboard/{board.id}/edit"
                class="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
              >
                Edit
              </a>
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors shadow-sm"
                on:click={() => viewBoard(board.id)}
              >
                View
              </button>
              <form method="POST" action="?/updateState" class="flex-1">
                <input type="hidden" name="boardId" value={board.id} />
                <input type="hidden" name="state" value={board.state === 'active' ? 'inactive' : 'active'} />
                <button
                  type="submit"
                  class="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors shadow-sm {board.state === 'active' ? 'bg-surface-elevated text-foreground border-border hover:bg-surface' : 'bg-primary text-primary-foreground border-primary hover:bg-primary-alt'}"
                >
                  {board.state === 'active' ? 'Set inactive' : 'Set active'}
                </button>
              </form>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Desktop Table Layout -->
    <div class="hidden md:block border border-border rounded-xl bg-surface-elevated overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="bg-surface text-muted-foreground uppercase text-xs tracking-wide border-b border-border">
            <th class="px-3 py-3 font-medium w-14"></th>
            <th class="px-3 py-3 font-medium">Name</th>
            <th class="px-3 py-3 font-medium">Price</th>
            <th class="px-3 py-3 font-medium">State</th>
            <th class="px-3 py-3 font-medium">Location</th>
            <th class="px-3 py-3 font-medium w-44"></th>
          </tr>
        </thead>
        <tbody>
          {#each boards as board}
            <tr class="border-b border-border/50 hover:bg-surface/70 transition-colors">
              <td class="px-3 py-2">
                <div class="w-11 aspect-[3/4] rounded-md overflow-hidden bg-surface border border-border flex-shrink-0">
                  <img
                    src={board.image_url ?? "https://via.placeholder.com/800x600?text=No+Image"}
                    alt={board.name}
                    class="object-cover w-full h-full"
                    loading="lazy"
                    on:error={(e) => ((e.currentTarget as HTMLImageElement).src = "https://via.placeholder.com/800x600?text=No+Image")}
                  />
                </div>
              </td>
              <td class="px-3 py-2">
                <div class="font-semibold text-foreground leading-tight">{board.name}</div>
                <div class="text-xs text-muted-foreground mt-0.5">{formatDate(board.created_at)}</div>
              </td>
              <td class="px-3 py-2">
                <span class="text-foreground font-medium whitespace-nowrap">{formatPrice(board.price)}</span>
              </td>
              <td class="px-3 py-2">
                {#if board.state === 'active'}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-primary-foreground">active</span>
                {:else}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface text-muted-foreground border border-border">{board.state ?? '—'}</span>
                {/if}
              </td>
              <td class="px-3 py-2">
                <div class="text-sm text-foreground whitespace-nowrap">
                  {#if board.city || board.region}
                    {board.city || ''}{board.city && board.region ? ', ' : ''}{board.region || ''}
                  {:else}
                    <span class="text-muted-foreground">—</span>
                  {/if}
                </div>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center justify-end gap-1.5">
                  <a
                    href="/shops/{shop.slug}/dashboard/{board.id}/edit"
                    class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary-alt transition-colors"
                  >
                    Edit
                  </a>
                  <button
                    type="button"
                    class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors"
                    on:click={() => viewBoard(board.id)}
                  >
                    View
                  </button>
                  <form method="POST" action="?/updateState">
                    <input type="hidden" name="boardId" value={board.id} />
                    <input type="hidden" name="state" value={board.state === 'active' ? 'inactive' : 'active'} />
                    <button
                      type="submit"
                      class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm {board.state === 'active' ? 'bg-surface-elevated text-foreground border-border hover:bg-surface' : 'bg-primary text-primary-foreground border-primary hover:bg-primary-alt'}"
                    >
                      {board.state === 'active' ? 'Set inactive' : 'Set active'}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
