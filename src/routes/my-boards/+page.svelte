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

  function handleEditClick(event: MouseEvent, boardId: string) {
    event.preventDefault();
    event.stopPropagation();
    goto(`/edit-surfboard/${boardId}`);
  }
</script>

<section class="p-6">
  <h1 class="text-3xl font-bold mb-6 text-center">My Boards</h1>
  <div class="flex justify-center mb-6">
    <a href="/create-surfboard" class="btn btn-primary"> + Add Board </a>
  </div>

  {#if errorMessage}
    <p class="text-center text-red-500">Error: {errorMessage}</p>
  {:else if boards.length === 0}
    <p class="text-center text-gray-400">You haven’t added any boards yet.</p>
  {:else}
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center"
    >
      {#each boards as board}
        <div class="relative w-full max-w-xs rounded-xl overflow-hidden bg-base-100 border border-base-300 shadow-sm hover:shadow-lg hover:-translate-y-[2px] transition-all duration-200 ease-out group">
          <a
            href={`/surfboards/${board.id}`}
            data-sveltekit-prefetch
            class="block"
          >
            <div class="relative aspect-square w-full bg-base-300">
              <img
                src={board.thumbnail_url ??
                  board.image_url ??
                  "https://via.placeholder.com/800x600?text=No+Image"}
                alt={board.name}
                class="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                on:error={(e) =>
                  ((e.currentTarget as HTMLImageElement).src =
                    "https://via.placeholder.com/800x600?text=No+Image")}
              />
              <!-- Edit button overlay (only visible on hover) -->
              <button
                type="button"
                class="absolute top-2 right-2 bg-primary text-white px-3 py-1.5 rounded-md text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-primary-focus shadow-lg z-10"
                on:click={(e) => handleEditClick(e, board.id)}
              >
                Edit
              </button>
            </div>
            <div class="p-4">
              <h2 class="font-semibold text-lg mb-1">{board.name}</h2>
              <p class="text-sm text-gray-400">
                {formatLength(board.length)} × {board.width}" × {board.thickness}"
              </p>
              <p class="text-sm mt-1">{board.condition}</p>
            </div>
          </a>
        </div>
      {/each}
    </div>
  {/if}
</section>
