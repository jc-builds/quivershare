<script lang="ts">
  import { goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { formatPrice } from '$lib/formatPrice';

  export let data;
  export let form;

  type Board = {
    id: string;
    name: string;
    image_url?: string;
    created_at?: string;
    state?: 'active' | 'inactive';
    source_type?: string;
    source_url?: string;
    city?: string;
    region?: string;
    price?: number | null;
    last_checked_at?: string | null;
    last_check_result?: string | null;
  };

  let boards: Board[] = data.boards ?? [];
  let errorMessage = data.errorMessage ?? '';

  let reviewBoard: Board | null = null;
  let reviewResult = '';
  let reviewNewPrice = '';
  let reviewNewSourceUrl = '';
  let reviewSubmitting = false;
  let reviewError = '';

  let openMenuId: string | null = null;

  $: boards = data.boards ?? [];
  $: currentStatus = (data as any).status ?? 'active';

  $: if (form?.context === 'deleteBoard' && form?.success === false) {
    errorMessage = form.message || 'Failed to delete board';
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
  }

  function formatDateTime(dateString: string | null | undefined): string {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }


  const RESULT_LABELS: Record<string, string> = {
    no_change: 'No change',
    price_changed: 'Price changed',
    sold: 'Sold',
    source_unavailable: 'Unavailable',
    link_changed: 'Link changed'
  };

  const RESULT_COLORS: Record<string, string> = {
    no_change: 'bg-surface text-muted-foreground border border-border',
    price_changed: 'bg-blue-500/10 text-blue-700 border border-blue-500/30',
    sold: 'bg-destructive/10 text-destructive border border-destructive/30',
    source_unavailable: 'bg-orange-500/10 text-orange-700 border border-orange-500/30',
    link_changed: 'bg-purple-500/10 text-purple-700 border border-purple-500/30'
  };

  function resultBadge(result: string | null | undefined): { label: string; cls: string } {
    if (!result) return { label: '—', cls: '' };
    return {
      label: RESULT_LABELS[result] ?? result,
      cls: RESULT_COLORS[result] ?? 'bg-surface text-muted-foreground border border-border'
    };
  }

  function viewBoard(boardId: string) {
    goto(`/surfboards/${boardId}`);
  }

  function editBoard(boardId: string) {
    goto(`/admin/curated-boards/${boardId}`);
  }

  function openReview(board: Board) {
    openMenuId = null;
    reviewBoard = board;
    reviewResult = '';
    reviewNewPrice = board.price != null ? String(board.price) : '';
    reviewNewSourceUrl = board.source_url ?? '';
    reviewError = '';
    reviewSubmitting = false;
  }

  function closeReview() {
    reviewBoard = null;
    reviewResult = '';
    reviewNewPrice = '';
    reviewNewSourceUrl = '';
    reviewError = '';
    reviewSubmitting = false;
  }

  function toggleMenu(boardId: string) {
    openMenuId = openMenuId === boardId ? null : boardId;
  }

  function closeMenus() {
    openMenuId = null;
  }
</script>

<svelte:window
  on:click={closeMenus}
  on:keydown={(e) => { if (e.key === 'Escape') { closeMenus(); if (reviewBoard) closeReview(); } }}
/>

<!-- Review Modal -->
{#if reviewBoard}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/50"
      on:click={closeReview}
      aria-label="Close review"
      tabindex="-1"
    ></button>

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="relative bg-surface-elevated border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-5"
      role="dialog"
      aria-label="Review board"
      tabindex="-1"
      on:click|stopPropagation
    >
      <div class="flex items-start justify-between gap-3">
        <h3 class="text-lg font-semibold text-foreground leading-tight">{reviewBoard.name}</h3>
        <button type="button" on:click={closeReview} class="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
      </div>

      <div class="space-y-1.5 text-sm text-muted-foreground">
        <div>Current price: <span class="font-medium text-foreground">{formatPrice(reviewBoard.price)}</span></div>
        {#if reviewBoard.source_url}
          <a href={reviewBoard.source_url} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-primary hover:underline">
            Open source listing ↗
          </a>
        {:else}
          <div>No source URL on file</div>
        {/if}
      </div>

      <form
        method="POST"
        action="?/recordMaintenanceReview"
        use:enhance={() => {
          reviewSubmitting = true;
          reviewError = '';
          return async ({ result, update }) => {
            reviewSubmitting = false;
            if (result.type === 'success') {
              closeReview();
              await update();
            } else if (result.type === 'failure') {
              reviewError = String((result as any).data?.message ?? 'Failed to record review');
              await update({ reset: false });
            } else {
              await update();
            }
          };
        }}
        class="space-y-4"
      >
        <input type="hidden" name="boardId" value={reviewBoard.id} />
        <input type="hidden" name="result" value={reviewResult} />

        <div>
          <div class="text-sm font-medium text-muted-foreground mb-2">Result</div>
          <div class="grid grid-cols-2 gap-2">
            {#each [
              { value: 'no_change', label: 'No change' },
              { value: 'price_changed', label: 'Price changed' },
              { value: 'sold', label: 'Sold' },
              { value: 'source_unavailable', label: 'Unavailable' },
              { value: 'link_changed', label: 'Link change' }
            ] as opt}
              <button
                type="button"
                class="px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  {reviewResult === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-foreground border-border hover:bg-muted'}"
                on:click={() => { reviewResult = opt.value; }}
              >
                {opt.label}
              </button>
            {/each}
          </div>
        </div>

        {#if reviewResult === 'price_changed'}
          <div>
            <label for="review-new-price" class="block text-sm font-medium text-muted-foreground mb-1">New price ($)</label>
            <input
              id="review-new-price"
              type="number"
              name="new_price"
              min="1"
              step="1"
              required
              bind:value={reviewNewPrice}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Enter new price"
            />
          </div>
        {/if}

        {#if reviewResult === 'link_changed'}
          <div>
            <label for="review-new-source-url" class="block text-sm font-medium text-muted-foreground mb-1">New source URL</label>
            <input
              id="review-new-source-url"
              type="url"
              name="new_source_url"
              required
              bind:value={reviewNewSourceUrl}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="https://..."
            />
          </div>
        {/if}

        {#if reviewError}
          <p class="text-sm text-destructive">{reviewError}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!reviewResult || reviewSubmitting}
            class="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reviewSubmitting ? 'Saving…' : 'Save Review'}
          </button>
          <button
            type="button"
            on:click={closeReview}
            class="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<section class="bg-background text-foreground">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 text-center sm:text-left gap-4">
    <h1 class="text-3xl font-semibold tracking-tight text-foreground">Curated Boards</h1>
    <div class="flex items-center gap-3">
      <select
        class="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        value={currentStatus}
        on:change={(e) => goto(`/admin/curated-boards?status=${e.currentTarget.value}`)}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="all">All</option>
      </select>
      <a
        href="/admin/curated-boards/new"
        class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        + Add Curated Board
      </a>
    </div>
  </div>

  {#if errorMessage}
    <p class="text-center text-destructive">Error: {errorMessage}</p>
  {:else if boards.length === 0}
    <p class="text-center text-muted-foreground">No curated boards yet.</p>
  {:else}
    <!-- Mobile Card Layout -->
    <div class="block md:hidden space-y-4">
      {#each boards as board}
        <div class="bg-surface-elevated border border-border rounded-xl overflow-hidden">
          <div class="w-full aspect-[3/4] max-h-[350px] bg-surface overflow-hidden">
            <img
              src={board.image_url ?? "/no-image.svg"}
              alt={board.name}
              class="object-cover w-full h-full"
              loading="lazy"
              on:error={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.endsWith('/no-image.svg')) img.src = '/no-image.svg';
              }}
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

            {#if board.source_type || board.source_url}
              <div class="flex items-center gap-2 text-xs">
                {#if board.source_type}
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-surface text-foreground border border-border">{board.source_type}</span>
                {/if}
                {#if board.source_url}
                  <a href={board.source_url} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline truncate">{board.source_url}</a>
                {/if}
              </div>
            {/if}

            <div class="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
              <span>Checked: {formatDateTime(board.last_checked_at)}</span>
              {#if board.last_check_result}
                {@const badge = resultBadge(board.last_check_result)}
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium {badge.cls}">{badge.label}</span>
              {/if}
            </div>

            <div class="flex gap-2 pt-1">
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
                on:click={() => openReview(board)}
              >
                Review
              </button>
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-surface text-foreground border border-border hover:bg-muted transition-colors shadow-sm"
                on:click={() => editBoard(board.id)}
              >
                Edit
              </button>
              <div class="relative">
                <button
                  type="button"
                  class="inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold bg-surface text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors"
                  on:click|stopPropagation={() => toggleMenu(board.id)}
                  aria-label="More actions"
                >
                  ⋯
                </button>
                {#if openMenuId === board.id}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <div class="absolute right-0 bottom-full mb-1 w-44 bg-surface-elevated border border-border rounded-lg shadow-lg z-30 py-1" on:click|stopPropagation role="menu" tabindex="-1">
                    <button type="button" class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors" on:click={() => { viewBoard(board.id); openMenuId = null; }}>
                      View public page
                    </button>
                    <form method="POST" action="?/updateState">
                      <input type="hidden" name="boardId" value={board.id} />
                      <input type="hidden" name="state" value={board.state === 'active' ? 'inactive' : 'active'} />
                      <button type="submit" class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                        {board.state === 'active' ? 'Set inactive' : 'Set active'}
                      </button>
                    </form>
                    <form method="POST" action="?/deleteBoard">
                      <input type="hidden" name="boardId" value={board.id} />
                      <button
                        type="submit"
                        class="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                        on:click={(e) => { if (!confirm('Delete this curated board? This cannot be undone.')) e.preventDefault(); }}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                {/if}
              </div>
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
            <th class="px-3 py-3 font-medium">Source</th>
            <th class="px-3 py-3 font-medium">Location</th>
            <th class="px-3 py-3 font-medium">Checked</th>
            <th class="px-3 py-3 font-medium">Result</th>
            <th class="px-3 py-3 font-medium w-36"></th>
          </tr>
        </thead>
        <tbody>
          {#each boards as board}
            <tr class="border-b border-border/50 hover:bg-muted transition-colors">
              <td class="px-3 py-2">
                <div class="w-11 aspect-[3/4] rounded-md overflow-hidden bg-surface border border-border flex-shrink-0">
                  <img
                    src={board.image_url ?? "/no-image.svg"}
                    alt={board.name}
                    class="object-cover w-full h-full"
                    loading="lazy"
                    on:error={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (!img.src.endsWith('/no-image.svg')) img.src = '/no-image.svg';
                    }}
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
              <td class="px-3 py-2 max-w-[180px]">
                {#if board.source_type}
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-surface text-foreground border border-border">{board.source_type}</span>
                {/if}
                {#if board.source_url}
                  <a href={board.source_url} target="_blank" rel="noopener noreferrer" class="block text-xs text-primary hover:underline truncate mt-0.5" title={board.source_url}>{board.source_url}</a>
                {:else if !board.source_type}
                  <span class="text-xs text-muted-foreground">—</span>
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
                <div class="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(board.last_checked_at)}</div>
              </td>
              <td class="px-3 py-2">
                {#if board.last_check_result}
                  {@const badge = resultBadge(board.last_check_result)}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap {badge.cls}">{badge.label}</span>
                {:else}
                  <span class="text-xs text-muted-foreground">—</span>
                {/if}
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm"
                    on:click={() => openReview(board)}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface text-foreground border border-border hover:bg-muted transition-colors"
                    on:click={() => editBoard(board.id)}
                  >
                    Edit
                  </button>
                  <div class="relative">
                    <button
                      type="button"
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold bg-surface text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-colors"
                      on:click|stopPropagation={() => toggleMenu(board.id)}
                      aria-label="More actions"
                    >
                      ⋯
                    </button>
                    {#if openMenuId === board.id}
                      <!-- svelte-ignore a11y-click-events-have-key-events -->
                      <div class="absolute right-0 top-full mt-1 w-44 bg-surface-elevated border border-border rounded-lg shadow-lg z-30 py-1" on:click|stopPropagation role="menu" tabindex="-1">
                        <button type="button" class="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors" on:click={() => { viewBoard(board.id); openMenuId = null; }}>
                          View public page
                        </button>
                        <form method="POST" action="?/updateState">
                          <input type="hidden" name="boardId" value={board.id} />
                          <input type="hidden" name="state" value={board.state === 'active' ? 'inactive' : 'active'} />
                          <button type="submit" class="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors">
                            {board.state === 'active' ? 'Set inactive' : 'Set active'}
                          </button>
                        </form>
                        <form method="POST" action="?/deleteBoard">
                          <input type="hidden" name="boardId" value={board.id} />
                          <button
                            type="submit"
                            class="w-full text-left px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            on:click={(e) => { if (!confirm('Delete this curated board? This cannot be undone.')) e.preventDefault(); }}
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    {/if}
                  </div>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
