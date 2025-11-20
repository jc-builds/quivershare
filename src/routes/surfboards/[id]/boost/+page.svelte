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

  // Boost status logic
  $: currentBoost = data.currentBoost;
  $: hasActiveBoost = data.hasActiveBoost;

  // Status label mapping
  $: boostStatusLabel = currentBoost
    ? currentBoost.status === 'pending'
      ? 'Pending review'
      : currentBoost.status === 'live'
      ? 'Delivering'
      : currentBoost.status === 'completed'
      ? 'Completed'
      : currentBoost.status
    : null;

  // Status helper text
  $: boostStatusHelper = currentBoost
    ? currentBoost.status === 'pending'
      ? 'Your Boost request is pending review.'
      : currentBoost.status === 'live'
      ? 'Your Boost is currently running.'
      : currentBoost.status === 'completed'
      ? 'Your last Boost has completed. You can request another one below.'
      : null
    : null;

  // Format date for display
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Location autocomplete state
  let locationQuery = '';
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let selectedLocation: { label: string; lat: number; lon: number; city: string; region: string } | null = null;
  let locationDebounceHandle: any;

  // Location search functions
  async function searchLocationPlaces(q: string) {
    if (!q || q.length < 2) {
      locationSuggestions = [];
      return;
    }
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    locationSuggestions = data.features ?? [];
  }

  function onLocationInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    locationQuery = v;
    selectedLocation = null;

    clearTimeout(locationDebounceHandle);
    locationDebounceHandle = setTimeout(() => searchLocationPlaces(locationQuery), 200);
  }

  function chooseLocationSuggestion(s: (typeof locationSuggestions)[number]) {
    locationQuery = s.label;
    selectedLocation = {
      label: s.label,
      lat: s.lat,
      lon: s.lon,
      city: s.city,
      region: s.region
    };
    locationSuggestions = [];
  }
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
    <div class="flex items-center gap-2 mb-2">
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Boost This Board</h1>
      <!-- Help Icon with Tooltip -->
      <div class="relative group">
        <button
          type="button"
          class="flex items-center justify-center w-5 h-5 rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="What's a Boost?"
        >
          <span class="text-xs font-medium">?</span>
        </button>
        <!-- Tooltip -->
        <div class="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 sm:w-80 p-3 bg-surface-elevated border border-border rounded-lg shadow-lg text-xs text-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 z-50 pointer-events-none">
          <p class="font-semibold mb-1.5 text-foreground">What's a Boost?</p>
          <p class="text-muted-foreground leading-relaxed">
            A Boost is a 14-day paid Instagram + Facebook promotion for your board targeting local surfers. It typically reaches around 3,000 people. 
          </p>
        </div>
      </div>
    </div>

    <!-- Description Blurb -->
    <p class="text-sm sm:text-base text-foreground/80 mb-4 sm:mb-6">
      A Boost is a 14-day paid ad for your board on Instagram and Facebook, typically reaching around 3,000 local surfers.
    </p>
    <p class="text-sm sm:text-base text-foreground/80 mb-6">
      For a limited time, pilot clients receive <span class="font-semibold text-primary">one free Boost</span> for every surfboard they list.
    </p>
    

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
              <p class="text-xs uppercase tracking-wide text-muted-foreground mb-1">Asking Price</p>
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
      <h2 class="text-lg sm:text-xl font-semibold mb-4 text-foreground">Boost Settings</h2>

      {#if form?.success}
        <div class="mb-6 rounded-lg border border-border/60 bg-emerald-500/10 text-emerald-300 px-4 py-3 text-sm">
          <span>{form.message || 'Boost request submitted successfully!'}</span>
        </div>
      {:else if form?.message && !form?.success}
        <div class="mb-6 rounded-lg border border-red-500/60 bg-surface p-3 text-sm text-red-400">
          <span>{form.message}</span>
        </div>
      {/if}

      <!-- Current Boost Status Card -->
      {#if currentBoost}
        <div class="mb-6 rounded-xl border border-border/70 bg-surface-elevated/80 px-4 py-3">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {hasActiveBoost ? 'Current Boost' : 'Last Boost'}
            </p>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium {currentBoost.status === 'pending'
                ? 'bg-warning/20 text-warning'
                : currentBoost.status === 'live'
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground'}"
            >
              {boostStatusLabel}
            </span>
          </div>

          <div class="space-y-2 text-sm">
            <div>
              <span class="text-muted-foreground">Target area: </span>
              <span class="text-foreground">{currentBoost.target_area}</span>
            </div>
            <div>
              <span class="text-muted-foreground">Dates: </span>
              <span class="text-foreground">
                {formatDate(currentBoost.start_date)} – {formatDate(currentBoost.end_date)}
              </span>
            </div>
            <div>
              <span class="text-muted-foreground">Type: </span>
              <span class="text-foreground">
                {currentBoost.kind === 'free' ? 'Free Boost' : 'Paid Boost'}
              </span>
            </div>
          </div>

          {#if boostStatusHelper}
            <p class="mt-3 text-xs text-muted-foreground">{boostStatusHelper}</p>
          {/if}
        </div>
      {/if}

      {#if hasActiveBoost}
        <!-- Active boost - hide form and show message -->
        <div class="rounded-lg border border-border/60 bg-surface/50 px-4 py-3 text-sm text-muted-foreground">
          <p>You already have a Boost in progress for this board.</p>
        </div>
      {:else}
        <!-- No active boost - show form -->
        <form method="POST" class="space-y-6 sm:space-y-7 max-w-xl" use:enhance>
        <!-- Hidden: board id -->
        <input type="hidden" name="board_id" value={data.board.id} />

        <!-- Target Area -->
        <div class="space-y-1.5">
          <label for="target_area" class="block text-xs font-medium text-muted-foreground">
            Target area
          </label>
          <div class="relative">
            <input
              type="text"
              id="target_area"
              class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Start typing... e.g. Rockaway Beach, NY"
              value={locationQuery}
              on:input={onLocationInput}
              autocomplete="off"
              aria-autocomplete="list"
              aria-controls="location-suggestions-list"
              required
            />
            {#if locationSuggestions.length > 0}
              <ul
                id="location-suggestions-list"
                class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg text-sm"
              >
                {#each locationSuggestions as s}
                  <li>
                    <button
                      type="button"
                      class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface transition-colors"
                      on:click={() => chooseLocationSuggestion(s)}
                    >
                      {s.label}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          {#if selectedLocation}
            <p class="mt-1 text-xs text-muted-foreground">
              Selected: {selectedLocation.label}
            </p>
          {/if}
          <p class="mt-1 text-xs text-muted-foreground">
            Select a location where you want your board to be promoted. Boosts will target surfers in this area.
          </p>
          <!-- Hidden field to submit the selected location label -->
          <input type="hidden" name="target_area" value={selectedLocation?.label || ''} />
        </div>

        <!-- Start Date -->
        <div class="space-y-1.5">
          <label for="start_date" class="block text-xs font-medium text-muted-foreground">
            Start date
          </label>
          <input
            type="date"
            id="start_date"
            name="start_date"
            class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            value={new Date().toISOString().split('T')[0]}
            required
          />
          <p class="mt-1 text-xs text-muted-foreground">
            Boosts run for 14 days from the selected start date.
          </p>
        </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <button type="submit" class="inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed">
              Submit Boost Request
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
</section>

