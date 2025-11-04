<script lang="ts">
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
        <a
          href={`/edit-surfboard/${board.id}`}
          data-sveltekit-preload-data
          class="block w-full max-w-xs rounded-xl overflow-hidden bg-base-100 border border-base-300 shadow-sm
         hover:shadow-lg hover:-translate-y-[2px] transition-all duration-200 ease-out"
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
          </div>
          <div class="p-4">
            <h2 class="font-semibold text-lg mb-1">{board.name}</h2>
            <p class="text-sm text-gray-400">
              {board.length}" × {board.width}" × {board.thickness}"
            </p>
            <p class="text-sm mt-1">{board.condition}</p>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
