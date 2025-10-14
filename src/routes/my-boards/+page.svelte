<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabaseClient";

    type Board = {
        id: string;
        name: string;
        image_url?: string;
        length?: number;
        width?: number;
        thickness?: number;
        condition?: string;
    };

    let boards: Board[] = [];
    let loading = true;
    let errorMessage = "";

    onMount(async () => {
        const { data, error } = await supabase.from("surfboards").select("*");

        if (error) {
            errorMessage = error.message;
        } else if (data) {
            boards = data as Board[];
        }

        loading = false;
    });
</script>

<section class="p-6">
    <h1 class="text-3xl font-bold mb-6 text-center">My Boards</h1>
    <div class="flex justify-center mb-6">
        <a href="/create-surfboard" class="btn btn-primary"> + Add Board </a>
    </div>

    {#if loading}
        <p class="text-center text-gray-400">Loading your boards...</p>
    {:else if errorMessage}
        <p class="text-center text-red-500">Error: {errorMessage}</p>
    {:else if boards.length === 0}
        <p class="text-center text-gray-400">
            You haven’t added any boards yet.
        </p>
    {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each boards as board}
                <a
                    href={`/edit-surfboard/${board.id}`}
                    class="block rounded-lg overflow-hidden shadow-lg hover:shadow-xl bg-base-200 transition-all"
                >
                    <img
                        src={board.image_url || "/placeholder.jpg"}
                        alt={board.name}
                        class="w-full h-48 object-cover"
                    />
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
