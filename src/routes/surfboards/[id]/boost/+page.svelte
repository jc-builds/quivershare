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

<section class="min-h-screen bg-background text-foreground">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
    <!-- Breadcrumb -->
    <nav class="mb-4" aria-label="Breadcrumb">
      <a
        href="/my-boards"
        class="text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        My Boards
      </a>
      <span class="text-xs sm:text-sm text-muted-foreground mx-2">/</span>
      <a
        href="/surfboards/{data.board.id}"
        class="text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        {boardTitle}
      </a>
      <span class="text-xs sm:text-sm text-muted-foreground mx-2">/</span>
      <span class="text-xs sm:text-sm text-muted-foreground">Manage Boost</span>
    </nav>

    <!-- Header -->
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Boost this board</h1>

    <!-- Board Summary Card -->
    <div class="bg-surface-elevated/90 rounded-xl border border-border shadow-sm p-5 sm:p-6">
      <h2 class="text-lg sm:text-xl font-semibold mb-4 text-foreground">Board Summary</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        <!-- Left: Image -->
        {#if mainImage}
          <div class="group rounded-xl overflow-hidden bg-surface border border-border/70 w-full max-w-[280px] h-[420px] mx-auto md:mx-0">
            <img
              src={mainImage}
              alt={boardTitle}
              class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>
        {/if}

        <!-- Right: Details -->
        <div class="space-y-4">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Board Title</p>
            <p class="text-sm sm:text-base font-medium text-foreground">{boardTitle}</p>
          </div>

          {#if data.board.price != null}
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Price</p>
              <p class="text-lg sm:text-xl font-semibold text-primary">
                ${data.board.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          {/if}

          {#if data.board.length != null || data.board.width != null || data.board.thickness != null}
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Dimensions</p>
              <p class="text-sm sm:text-base font-medium text-foreground">
                {formatDimensions(data.board.length, data.board.width, data.board.thickness)}
              </p>
            </div>
          {/if}

          {#if data.board.volume != null}
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Volume</p>
              <p class="text-sm sm:text-base font-medium text-foreground">{data.board.volume}L</p>
            </div>
          {/if}

          {#if data.board.style}
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Style</p>
              <p class="text-sm sm:text-base font-medium text-foreground">{data.board.style}</p>
            </div>
          {/if}

          {#if data.board.condition}
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Condition</p>
              <p class="text-sm sm:text-base font-medium text-foreground">{data.board.condition}</p>
            </div>
          {/if}

          {#if data.board.city || data.board.region}
            <div>
              <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Location</p>
              <p class="text-sm sm:text-base font-medium text-foreground">
                {[data.board.city, data.board.region].filter(Boolean).join(', ') || 'N/A'}
              </p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Boost Form Card -->
    <div class="bg-surface-elevated/90 rounded-xl border border-border shadow-sm p-5 sm:p-6">
      <h2 class="text-lg sm:text-xl font-semibold mb-4 text-foreground">Boost settings</h2>

      {#if form?.success}
        <div class="mb-6 rounded-lg border border-border/60 bg-emerald-500/10 text-emerald-300 px-4 py-3 text-sm">
          <span>{form.message || 'Boost request submitted successfully!'}</span>
        </div>
      {/if}

      <form method="POST" class="space-y-6 sm:space-y-7 max-w-xl" use:enhance>
        <!-- Hidden: board id -->
        <input type="hidden" name="board_id" value={data.board.id} />

        <!-- Target Area -->
        <div class="space-y-1.5">
          <label for="target_area" class="block text-xs font-medium text-muted-foreground">
            Target area
          </label>
          <input
            type="text"
            id="target_area"
            name="target_area"
            class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="e.g. Rockaway Beach, NY or 11231 + 25 miles"
            required
          />
          <p class="mt-1 text-xs text-muted-foreground">
            City/region or zip + optional radius (e.g. 'Rockaway Beach, NY', '11231 + 25 miles').
          </p>
        </div>

        <!-- Audience Skill Level -->
        <div class="space-y-1.5">
          <label for="skill_level" class="block text-xs font-medium text-muted-foreground">
            Surfer skill level
          </label>
          <select id="skill_level" name="skill_level" class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <option value="">Select skill level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="not_sure">Not sure</option>
          </select>
        </div>

        <!-- Age Range -->
        <div class="space-y-1.5">
          <label for="age_range" class="block text-xs font-medium text-muted-foreground">
            Age range
          </label>
          <select id="age_range" name="age_range" class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <option value="18-55" selected>18-55 (default)</option>
            <option value="16-25">16-25</option>
            <option value="25-45">25-45</option>
            <option value="45+">45+</option>
            <option value="all">All</option>
          </select>
        </div>

        <!-- Duration / Dates -->
        <div class="space-y-1.5">
          <div class="text-xs font-medium text-muted-foreground mb-1">Duration / Dates</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="start_date" class="block text-xs font-medium text-muted-foreground">
                Start date
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label for="end_date" class="block text-xs font-medium text-muted-foreground">
                End date
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
          </div>
        </div>

        <!-- Boost Goal -->
        <div class="space-y-1.5">
          <label for="goal" class="block text-xs font-medium text-muted-foreground">
            Boost goal
          </label>
          <select id="goal" name="goal" class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <option value="">Select goal</option>
            <option value="sell_fast">Sell fast</option>
            <option value="more_views">Get more views</option>
            <option value="more_messages">Get more messages</option>
          </select>
        </div>

        <!-- Optional Notes -->
        <div class="space-y-1.5">
          <label for="notes" class="block text-xs font-medium text-muted-foreground">
            Anything else I should know?
          </label>
          <textarea
            id="notes"
            name="notes"
            class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground min-h-[120px] resize-vertical shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            rows="4"
            placeholder="Example: great for beginners, firm on price, open to trades, etc."
          ></textarea>
          <p class="mt-1 text-xs text-muted-foreground">
            Example: great for beginners, firm on price, open to trades, etc.
          </p>
        </div>

        <!-- Submit Button -->
        <div class="pt-4">
          <button type="submit" class="inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed">
            Submit Boost Request
          </button>
        </div>
      </form>
    </div>
  </div>
</section>

