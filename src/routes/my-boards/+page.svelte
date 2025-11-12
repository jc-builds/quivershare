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

  let boostingId: string | null = null;

  async function boostBoard(event: MouseEvent, boardId: string) {
    event.preventDefault();
    event.stopPropagation();
    if (boostingId) return;
    boostingId = boardId;
    try {
      const res = await fetch('/api/boost', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ surfboard_id: boardId })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? 'Failed to boost board');
      }
      alert('Boost successful!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Boost failed';
      alert(message);
    } finally {
      boostingId = null;
    }
  }

  function handleEditClick(event: MouseEvent, boardId: string) {
    event.preventDefault();
    event.stopPropagation();
    goto(`/edit-surfboard/${boardId}`);
  }

  function isBoardLive(board: Board) {
    return board.boosts?.some((boost) => boost?.status === 'live') ?? false;
  }

  function viewBoard(boardId: string) {
    goto(`/surfboards/${boardId}`);
  }
</script>

<section class="p-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 text-center sm:text-left gap-4">
    <h1 class="text-3xl font-bold">My Boards</h1>
    <a href="/create-surfboard" class="btn btn-primary">+ Add Board</a>
  </div>  


  {#if errorMessage}
    <p class="text-center text-red-500">Error: {errorMessage}</p>
  {:else if boards.length === 0}
    <p class="text-center text-gray-400">You haven’t added any boards yet.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="table table-zebra w-full min-w-[720px]">
        <thead>
          <tr>
            <th>Thumb</th>
            <th>Name</th>
            <th>Dimensions</th>
            <th>Condition</th>
            <th>Boost</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each boards as board}
            {@const live = isBoardLive(board)}
            <tr>
              <td>
                <div class="avatar">
                  <div class="mask mask-squircle w-16 h-16 bg-base-300">
                    <img
                      src={board.thumbnail_url ??
                        board.image_url ??
                        "https://via.placeholder.com/800x600?text=No+Image"}
                      alt={board.name}
                      loading="lazy"
                      on:error={(e) =>
                        ((e.currentTarget as HTMLImageElement).src =
                          "https://via.placeholder.com/800x600?text=No+Image")}
                    />
                  </div>
                </div>
              </td>
              <td>
                <div class="font-semibold">{board.name}</div>
                <div class="text-xs text-base-content/60">ID: {board.id}</div>
              </td>
              <td>
                <div class="text-sm text-base-content/80">
                  {formatLength(board.length)} × {board.width}" × {board.thickness}"
                </div>
              </td>
              <td>
                <span class="badge badge-ghost">{board.condition ?? '—'}</span>
              </td>
              <td>
                <span class={`badge ${live ? 'badge-success' : 'badge-neutral'}`}>
                  {live ? 'Live' : 'Not live'}
                </span>
              </td>
              <td>
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    class="btn btn-sm"
                    on:click={() => viewBoard(board.id)}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-info"
                    on:click={(e) => handleEditClick(e, board.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class={`btn btn-sm ${live ? 'btn-disabled' : 'btn-primary'}`}
                    on:click={(event) => boostBoard(event, board.id)}
                    disabled={live || boostingId === board.id}
                    title={live ? 'Boost active' : undefined}
                  >
                    {live ? 'Live' : boostingId === board.id ? 'Boosting…' : 'Boost'}
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
