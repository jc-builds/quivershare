<script lang="ts">
  import { enhance } from '$app/forms';
  import type { BoardPageData } from './+page.server';

  export let data: BoardPageData;
  export let form;

  // Helper: Format dimensions (reused from board page)
  function formatDimensions(
    length: number | null | undefined,
    width: number | null | undefined,
    thickness: number | null | undefined
  ): string {
    const parts: string[] = [];
    if (length != null) {
      const feet = Math.floor(length / 12);
      const inches = length % 12;
      parts.push(`${feet}'${inches}"`);
    }
    if (width != null) parts.push(`${width}"`);
    if (thickness != null) parts.push(`${thickness}"`);
    return parts.length > 0 ? parts.join(' × ') : 'N/A';
  }

  // Get board title (reused from board page)
  $: boardTitle = (() => {
    const parts: string[] = [];
    if (data.board.length != null) {
      const feet = Math.floor(data.board.length / 12);
      const inches = data.board.length % 12;
      parts.push(`${feet}'${inches}"`);
    }
    if (data.board.make) parts.push(data.board.make);
    if (data.board.name) parts.push(data.board.name);
    return parts.length > 0 ? parts.join(' ') : 'Untitled Board';
  })();

  // Get main image for display
  $: mainImage = data.images[0]?.image_url || data.board.thumbnail_url;
</script>

<svelte:head>
  <title>Boost {boardTitle} | QuiverShare</title>
</svelte:head>

<section class="min-h-screen bg-base-200">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
    <!-- Breadcrumb -->
    <nav class="mb-4" aria-label="Breadcrumb">
      <a
        href="/my-boards"
        class="text-sm text-base-content/60 hover:text-base-content hover:underline"
      >
        My Boards
      </a>
      <span class="text-sm text-base-content/60 mx-2">/</span>
      <a
        href="/surfboards/{data.board.id}"
        class="text-sm text-base-content/60 hover:text-base-content hover:underline"
      >
        {boardTitle}
      </a>
      <span class="text-sm text-base-content/60 mx-2">/</span>
      <span class="text-sm text-base-content/60">Manage Boost</span>
    </nav>

    <!-- Header -->
    <h1 class="text-3xl sm:text-4xl font-bold">Boost this board</h1>

    <!-- Board Summary Card -->
    <div class="bg-base-100 rounded-lg shadow-md p-6">
      <h2 class="text-xl font-bold mb-4">Board Summary</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left: Image -->
        {#if mainImage}
          <div class="rounded-lg overflow-hidden bg-base-300 w-full max-w-[300px] h-[450px] mx-auto md:mx-0">
            <img
              src={mainImage}
              alt={boardTitle}
              class="w-full h-full object-cover"
            />
          </div>
        {/if}

        <!-- Right: Details -->
        <div class="space-y-4">
          <div>
            <p class="text-sm text-base-content/70 mb-1">Board Title</p>
            <p class="text-lg font-semibold">{boardTitle}</p>
          </div>

          {#if data.board.price != null}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Price</p>
              <p class="text-xl font-bold text-primary">
                ${data.board.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          {/if}

          {#if data.board.length != null || data.board.width != null || data.board.thickness != null}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Dimensions</p>
              <p class="text-lg font-semibold">
                {formatDimensions(data.board.length, data.board.width, data.board.thickness)}
              </p>
            </div>
          {/if}

          {#if data.board.volume != null}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Volume</p>
              <p class="text-lg font-semibold">{data.board.volume}L</p>
            </div>
          {/if}

          {#if data.board.style}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Style</p>
              <p class="text-lg font-semibold">{data.board.style}</p>
            </div>
          {/if}

          {#if data.board.condition}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Condition</p>
              <p class="text-lg font-semibold">{data.board.condition}</p>
            </div>
          {/if}

          {#if data.board.city || data.board.region}
            <div>
              <p class="text-sm text-base-content/70 mb-1">Location</p>
              <p class="text-lg font-semibold">
                {[data.board.city, data.board.region].filter(Boolean).join(', ') || 'N/A'}
              </p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Boost Form Card -->
    <div class="bg-base-100 rounded-lg shadow-md p-6">
      <h2 class="text-2xl font-bold mb-4">Boost settings</h2>

      {#if form?.success}
        <div class="alert alert-success mb-6">
          <span>{form.message || 'Boost request submitted successfully!'}</span>
        </div>
      {/if}

      <form method="POST" class="space-y-6 max-w-xl" use:enhance>
        <!-- Hidden: board id -->
        <input type="hidden" name="board_id" value={data.board.id} />

        <!-- Target Area -->
        <div class="form-control">
          <label for="target_area" class="label">
            <span class="label-text font-semibold">Target area</span>
          </label>
          <input
            type="text"
            id="target_area"
            name="target_area"
            class="input input-bordered w-full"
            placeholder="e.g. Rockaway Beach, NY or 11231 + 25 miles"
            required
          />
          <div class="label">
            <span class="label-text-alt text-base-content/60">
              City/region or zip + optional radius (e.g. 'Rockaway Beach, NY', '11231 + 25 miles').
            </span>
          </div>
        </div>

        <!-- Audience Skill Level -->
        <div class="form-control">
          <label for="skill_level" class="label">
            <span class="label-text font-semibold">Surfer skill level</span>
          </label>
          <select id="skill_level" name="skill_level" class="select select-bordered w-full">
            <option value="">Select skill level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="not_sure">Not sure</option>
          </select>
        </div>

        <!-- Age Range -->
        <div class="form-control">
          <label for="age_range" class="label">
            <span class="label-text font-semibold">Age range</span>
          </label>
          <select id="age_range" name="age_range" class="select select-bordered w-full">
            <option value="18-55" selected>18-55 (default)</option>
            <option value="16-25">16-25</option>
            <option value="25-45">25-45</option>
            <option value="45+">45+</option>
            <option value="all">All</option>
          </select>
        </div>

        <!-- Duration / Dates -->
        <div class="form-control">
          <div class="label">
            <span class="label-text font-semibold">Duration / Dates</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="start_date" class="label">
                <span class="label-text">Start date</span>
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                class="input input-bordered w-full"
                value={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label for="end_date" class="label">
                <span class="label-text">End date</span>
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                class="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        <!-- Boost Goal -->
        <div class="form-control">
          <label for="goal" class="label">
            <span class="label-text font-semibold">Boost goal</span>
          </label>
          <select id="goal" name="goal" class="select select-bordered w-full">
            <option value="">Select goal</option>
            <option value="sell_fast">Sell fast</option>
            <option value="more_views">Get more views</option>
            <option value="more_messages">Get more messages</option>
          </select>
        </div>

        <!-- Optional Notes -->
        <div class="form-control">
          <label for="notes" class="label">
            <span class="label-text font-semibold">Anything else I should know?</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            class="textarea textarea-bordered w-full"
            rows="4"
            placeholder="Example: great for beginners, firm on price, open to trades, etc."
          ></textarea>
          <div class="label">
            <span class="label-text-alt text-base-content/60">
              Example: great for beginners, firm on price, open to trades, etc.
            </span>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="form-control pt-4">
          <button type="submit" class="btn btn-primary w-full">
            Submit Boost Request
          </button>
        </div>
      </form>
    </div>
  </div>
</section>

