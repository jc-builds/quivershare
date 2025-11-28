<script lang="ts">
  import { goto } from '$app/navigation';

  export let data;

  type Board = {
    id: string;
    name: string;
    thumbnail_url?: string;
    image_url?: string;
    length?: number;
    width?: number;
    thickness?: number;
    condition?: string;
    boosts?: { status: string }[];
    created_at?: string; // ISO timestamp
    state?: 'active' | 'inactive';
  };

  let boards: Board[] = data.boards ?? [];
  let errorMessage = data.errorMessage ?? "";

  // Convert inches to feet and inches format (e.g., 96 -> "8'0\"")
  function formatLength(inches: number | null | undefined): string {
    if (inches == null) return "";
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      year: '2-digit',
      month: 'numeric',
      day: 'numeric'
    });
  }

  function handleEditClick(event: MouseEvent, boardId: string) {
    event.preventDefault();
    event.stopPropagation();
    goto(`/edit-surfboard/${boardId}`);
  }


  function viewBoard(boardId: string) {
    goto(`/surfboards/${boardId}`);
  }
</script>

<section class="bg-background text-foreground min-h-screen p-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 text-center sm:text-left gap-4">
    <h1 class="text-3xl font-semibold tracking-tight text-foreground">My Boards</h1>
    <a 
      href="/create-surfboard" 
      class="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary-alt transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      + Add Board
    </a>
  </div>  


  {#if errorMessage}
    <p class="text-center text-red-400">Error: {errorMessage}</p>
  {:else if boards.length === 0}
    <p class="text-center text-muted-foreground">You haven't added any boards yet.</p>
  {:else}
    <!-- Mobile Card Layout -->
    <div class="block md:hidden space-y-4">
      {#each boards as board}
        <div class="bg-surface-elevated border border-border rounded-xl overflow-hidden">
          <!-- Thumbnail -->
          <div class="w-full aspect-[3/4] max-h-[350px] bg-surface overflow-hidden">
            <img
              src={board.thumbnail_url ??
                board.image_url ??
                "https://via.placeholder.com/800x600?text=No+Image"}
              alt={board.name}
              class="object-cover w-full h-full"
              loading="lazy"
              on:error={(e) =>
                ((e.currentTarget as HTMLImageElement).src =
                  "https://via.placeholder.com/800x600?text=No+Image")}
            />
          </div>
          
          <!-- Card Content -->
          <div class="p-4 space-y-3">
            <!-- Name and State -->
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-semibold text-foreground text-lg flex-1">{board.name}</h3>
              {#if board.state === 'active'}
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-primary-foreground whitespace-nowrap">
                  {board.state}
                </span>
              {:else}
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface text-muted-foreground border border-border whitespace-nowrap">
                  {board.state ?? 'unknown'}
                </span>
              {/if}
            </div>
            
            <!-- Created Date (optional) -->
            {#if board.created_at}
              <div class="text-xs text-muted-foreground">
                Created: {formatDate(board.created_at)}
              </div>
            {/if}
            
            <!-- Action Buttons -->
            <div class="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                class="flex-1 min-w-[100px] inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors shadow-sm"
                on:click={() => viewBoard(board.id)}
              >
                View
              </button>
              <button
                type="button"
                class="flex-1 min-w-[100px] inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors shadow-sm"
                on:click={(e) => handleEditClick(e, board.id)}
              >
                Edit
              </button>
              <button
                type="button"
                class="flex-1 min-w-[100px] inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                on:click={() => goto(`/surfboards/${board.id}/boost`)}
              >
                Boost
              </button>
              <!-- State Toggle -->
              <form method="POST" action="?/updateState" class="flex-1 min-w-[100px]">
                <input type="hidden" name="boardId" value={board.id} />
                <input type="hidden" name="state" value={board.state === 'active' ? 'inactive' : 'active'} />
                <button
                  type="submit"
                  class="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors shadow-sm {board.state === 'active' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary-alt' : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'}"
                  title={board.state === 'active' ? 'Set to inactive' : 'Set to active'}
                >
                  {board.state === 'active' ? 'Inactivate' : 'Activate'}
                </button>
              </form>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Desktop Table Layout -->
    <div class="hidden md:block overflow-x-auto border border-border rounded-xl bg-surface-elevated">
      <table class="w-full text-left text-sm min-w-[720px]">
        <thead>
          <tr class="bg-surface text-muted-foreground uppercase text-xs tracking-wide border-b border-border">
            <th class="px-4 py-3 font-medium">Thumb</th>
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Created</th>
            <th class="px-4 py-3 font-medium">Dimensions</th>
            <th class="px-4 py-3 font-medium">Condition</th>
            <th class="px-4 py-3 font-medium">State</th>
            <th class="px-4 py-3 font-medium">Boost</th>
            <th class="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each boards as board}
            <tr class="border-b border-border/50 hover:bg-surface/70 transition-colors">
              <td class="px-4 py-3">
                <div class="w-16 h-16 rounded-md overflow-hidden bg-surface border border-border">
                  <img
                    src={board.thumbnail_url ??
                      board.image_url ??
                      "https://via.placeholder.com/800x600?text=No+Image"}
                    alt={board.name}
                    class="object-cover w-full h-full"
                    loading="lazy"
                    on:error={(e) =>
                      ((e.currentTarget as HTMLImageElement).src =
                        "https://via.placeholder.com/800x600?text=No+Image")}
                  />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="font-semibold text-foreground">{board.name}</div>
                <div class="text-xs text-muted-foreground">ID: {board.id}</div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm text-muted-foreground">
                  {formatDate(board.created_at)}
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm text-foreground">
                  {formatLength(board.length)} × {board.width}" × {board.thickness}"
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface text-foreground border border-border">
                  {board.condition ?? '—'}
                </span>
              </td>
              <td class="px-4 py-3">
                {#if board.state === 'active'}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary text-primary-foreground">
                    {board.state}
                  </span>
                {:else}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface text-muted-foreground border border-border">
                    {board.state ?? 'unknown'}
                  </span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <button
                  type="button"
                  class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                  on:click={() => goto(`/surfboards/${board.id}/boost`)}
                >
                  Manage Boost
                </button>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <!-- State Toggle -->
                  <form method="POST" action="?/updateState">
                    <input type="hidden" name="boardId" value={board.id} />
                    <input type="hidden" name="state" value={board.state === 'active' ? 'inactive' : 'active'} />
                    <button
                      type="submit"
                      class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors shadow-sm {board.state === 'active' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary-alt' : 'bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300'}"
                      title={board.state === 'active' ? 'Set to inactive' : 'Set to active'}
                    >
                      {board.state === 'active' ? 'Inactivate' : 'Activate'}
                    </button>
                  </form>
                  <button
                    type="button"
                    class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors shadow-sm"
                    on:click={() => viewBoard(board.id)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-surface-elevated text-foreground border border-border hover:bg-surface transition-colors shadow-sm"
                    on:click={(e) => handleEditClick(e, board.id)}
                  >
                    Edit
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
