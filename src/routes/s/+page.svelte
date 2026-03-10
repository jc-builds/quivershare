<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';

  export let data: { 
    userId: string | null;
    userLocation: string | null;
    userLocationLat: number | null;
    userLocationLon: number | null;
    boards: Board[];
    total: number;
    page: number;
    limit: number;
    sort: SortOption;
  };

  // Board type
  type Board = {
    id: string;
    name: string;
    make: string | null;
    price: number | null;
    length: number | null;
    width: number | null;
    thickness: number | null;
    volume: number | null;
    fin_system: string | null;
    fin_setup: string | null;
    style: string | null;
    condition: string | null;
    city: string | null;
    region: string | null;
    lat: number | null;
    lon: number | null;
    image_url: string | null;
    is_curated?: boolean | null;
    user_id: string;
    created_at: string;
    last_modified: string | null;
  };

  // Sort options
  type SortOption = 
    | 'price_asc'
    | 'price_desc'
    | 'name_asc'
    | 'name_desc'
    | 'created_asc'
    | 'created_desc';

  // State
  const placeholderThumbnail = 'https://via.placeholder.com/400x300?text=No+Image';
  const eagerImageCount = browser && window.innerWidth < 768 ? 1 : 2;
  let boards: Board[] = data.boards ?? [];
  let visibleBoards: Board[] = boards;
  let sortBy: SortOption = (data.sort ?? 'created_desc') as SortOption;
  let currentPage = data.page ?? 1;
  let totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.limit || 1)));
  let isFiltersOpen = false;
  let activeFilterLabels: string[] = [];
  let hasActiveFilters = false;
  let displayedResultsCount = data.total;

  $: boards = data.boards ?? [];

  $: visibleBoards = activeLocationFilter
    ? boards.filter((board) => passesLocationFilter(board))
    : boards;

  $: sortBy = (data.sort ?? 'created_desc') as SortOption;

  $: currentPage = data.page ?? 1;
  $: totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.limit || 1)));
  $: displayedResultsCount = activeLocationFilter ? visibleBoards.length : data.total;
  $: {
    const labels: string[] = [];
    if (selectedLength) labels.push(`Length: ${selectedLength}`);
    if (selectedVolume) labels.push(`Volume: ${selectedVolume}`);
    if (selectedFinSystem) labels.push(`Fin System: ${selectedFinSystem}`);
    if (selectedFinSetup) labels.push(`Fin Setup: ${selectedFinSetup}`);
    if (selectedStyle) labels.push(`Style: ${selectedStyle}`);
    if (activeLocationFilter) {
      labels.push(`Location: ${activeLocationFilter.radius}mi from ${activeLocationFilter.location.label}`);
    }
    activeFilterLabels = labels;
    hasActiveFilters = labels.length > 0;
  }

  function navigateWithParams(params: Record<string, string | null>) {
    const current = get(page);
    const search = new URLSearchParams(current.url.search);

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        search.delete(key);
      } else {
        search.set(key, value);
      }
    }

    const queryString = search.toString();
    const target = queryString ? `${current.url.pathname}?${queryString}` : current.url.pathname;
    goto(target);
  }

  function handleSortChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as SortOption;
    navigateWithParams({ sort: value, page: '1' });
  }

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    if (activeLocationFilter) return;
    const current = get(page);
    const search = new URLSearchParams(current.url.search);
    search.set('page', String(newPage));
    const queryString = search.toString();
    const target = queryString ? `${current.url.pathname}?${queryString}` : current.url.pathname;
    goto(target);
  }

  function openFiltersDrawer() {
    isFiltersOpen = true;
  }

  function closeFiltersDrawer() {
    isFiltersOpen = false;
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isFiltersOpen) {
      closeFiltersDrawer();
    }
  }

  function clearAllFilters() {
    activeLocationFilter = null;
    selectedLocation = null;
    locationSuggestions = [];
    searchRadius = 50;
    locationQuery = data.userLocation || '';
    closeFiltersDrawer();
    goto('/s');
  }

  // Location search state
  let locationQuery = data.userLocation || '';
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let selectedLocation: { label: string; lat: number; lon: number } | null = null;
  let searchRadius = 50; // Default 50 miles
  let locationDebounceHandle: any;
  let activeLocationFilter: { location: { label: string; lat: number; lon: number }; radius: number } | null = null;
  let initializedFromQuery = false;

  // Initialize selected location from user's profile
  $: if (data.userLocationLat && data.userLocationLon && !selectedLocation) {
    selectedLocation = {
      label: data.userLocation || 'Your location',
      lat: data.userLocationLat,
      lon: data.userLocationLon
    };
  }

  // Filter state
  let selectedLength: string | null = null;
  let selectedVolume: string | null = null;
  let selectedFinSystem: string | null = null;
  let selectedFinSetup: string | null = null;
  let selectedStyle: string | null = null;

  // Filter options
  const lengthOptions = [
    "5'6\"-6'0\"",
    "6'0\"-6'6\"",
    "6'6\"-7'0\"",
    "7'0\"-8'0\"",
    "8'0\"-9'0\"",
    "9'0\"-10'0\"",
    "More"
  ];
  const LENGTH_PARAM_MAP: Record<string, string> = {
    "5'6\"-6'0\"": '66-72',
    "6'0\"-6'6\"": '72-78',
    "6'6\"-7'0\"": '78-84',
    "7'0\"-8'0\"": '84-96',
    "8'0\"-9'0\"": '96-108',
    "9'0\"-10'0\"": '108-120',
    "More": '120+'
  };
  const LENGTH_LABEL_MAP: Record<string, string> = {
    '66-72': "5'6\"-6'0\"",
    '72-78': "6'0\"-6'6\"",
    '78-84': "6'6\"-7'0\"",
    '84-96': "7'0\"-8'0\"",
    '96-108': "8'0\"-9'0\"",
    '108-120': "9'0\"-10'0\"",
    '120+': "More"
  };

  const volumeOptions = [
    "<25L",
    "25L-30L",
    "30L-35L",
    "35L-40L",
    "40L-45L",
    "45L-50L",
    "More"
  ];
  const VOLUME_PARAM_MAP: Record<string, string> = {
    "<25L": '<25',
    "25L-30L": '25-30',
    "30L-35L": '30-35',
    "35L-40L": '35-40',
    "40L-45L": '40-45',
    "45L-50L": '45-50',
    "More": '50+'
  };
  const VOLUME_LABEL_MAP: Record<string, string> = {
    '<25': "<25L",
    '25-30': "25L-30L",
    '30-35': "30L-35L",
    '35-40': "35L-40L",
    '40-45': "40L-45L",
    '45-50': "45L-50L",
    '50+': "More"
  };

  const finSystemOptions = ["FCS", "FCS II", "Futures", "Glass On", "Single Fin Box"];
  const finSetupOptions = ["Single", "2+1", "Twin", "Twin + Trailer", "Twinzer", "Tri", "Quad", "Tri/Quad", "Bonzer", "4+1"];
  const FIN_SETUP_SLUG_MAP: Record<string, string> = {
    'Single': 'single',
    '2+1': '2-plus-1',
    'Twin': 'twin',
    'Twin + Trailer': 'twin-plus-trailer',
    'Twinzer': 'twinzer',
    'Tri': 'tri',
    'Quad': 'quad',
    'Tri/Quad': 'tri-quad',
    'Bonzer': 'bonzer',
    '4+1': '4-plus-1'
  };
  const FIN_SETUP_LABEL_MAP: Record<string, string> = {
    'single': 'Single',
    '2-plus-1': '2+1',
    'twin': 'Twin',
    'twin-plus-trailer': 'Twin + Trailer',
    'twinzer': 'Twinzer',
    'tri': 'Tri',
    'quad': 'Quad',
    'tri-quad': 'Tri/Quad',
    'bonzer': 'Bonzer',
    '4-plus-1': '4+1'
  };
  const styleOptions = ["Shortboard", "Mid-length", "Longboard", "Groveler / Fish", "Gun"];

  function displayStyle(style: string | null): string | null {
    if (!style) return null;
    return style === 'Groveler' ? 'Groveler / Fish' : style;
  }

  function formatBoardTitle(board: Board): string {
    if (board.length == null || Number.isNaN(board.length)) return board.name;
    const feet = Math.floor(board.length / 12);
    const inches = board.length % 12;
    return `${feet}'${inches}" ${board.name}`;
  }

  // Hydrate filter UI state from URL query parameters
  $: {
    const searchParams = get(page).url.searchParams;
    const lengthParam = searchParams.get('length') ?? '';
    const volumeParam = searchParams.get('volume') ?? '';
    const finSystemParam = searchParams.get('fin_system') ?? '';
    const finSetupParam = searchParams.get('fin_setup') ?? '';
    const styleParam = searchParams.get('style') ?? '';

    selectedLength = LENGTH_LABEL_MAP[lengthParam] ?? null;
    selectedVolume = VOLUME_LABEL_MAP[volumeParam] ?? null;
    selectedFinSystem = finSystemOptions.includes(finSystemParam) ? finSystemParam : null;
    selectedFinSetup = FIN_SETUP_LABEL_MAP[finSetupParam] ?? null;
    const normalizedStyleParam = styleParam === 'Groveler' ? 'Groveler / Fish' : styleParam;
    selectedStyle = styleOptions.includes(normalizedStyleParam) ? normalizedStyleParam : null;
  }

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

  function onLocationSearchInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    locationQuery = v;
    selectedLocation = null;

    clearTimeout(locationDebounceHandle);
    locationDebounceHandle = setTimeout(() => searchLocationPlaces(locationQuery), 200);
  }

  function handleLengthChange() {
    const paramValue =
      selectedLength && selectedLength !== 'More'
        ? LENGTH_PARAM_MAP[selectedLength] ?? null
        : null;
    navigateWithParams({ length: paramValue, page: '1' });
  }

  function handleVolumeChange() {
    const paramValue =
      selectedVolume && selectedVolume !== 'More'
        ? VOLUME_PARAM_MAP[selectedVolume] ?? null
        : null;
    navigateWithParams({ volume: paramValue, page: '1' });
  }

  function handleFinSystemChange() {
    const paramValue = selectedFinSystem || null;
    navigateWithParams({ fin_system: paramValue, page: '1' });
  }

  function handleFinSetupChange() {
    const slug = selectedFinSetup ? FIN_SETUP_SLUG_MAP[selectedFinSetup] ?? null : null;
    navigateWithParams({ fin_setup: slug, page: '1' });
  }

  function handleStyleChange() {
    const paramValue = selectedStyle || null;
    navigateWithParams({ style: paramValue, page: '1' });
  }

  function chooseLocationSuggestion(s: (typeof locationSuggestions)[number]) {
    locationQuery = s.label;
    selectedLocation = {
      label: s.label,
      lat: s.lat,
      lon: s.lon
    };
    locationSuggestions = [];
  }

  // Hydrate location filter from URL query parameters (from homepage search)
  $: (async () => {
    // Only run on client-side and only once
    if (!browser || initializedFromQuery) return;

    const $page = get(page);
    const searchParams = $page.url.searchParams;

    const q = searchParams.get('q');
    const distanceParam = searchParams.get('distance');

    if (!q) return; // nothing to hydrate from
    initializedFromQuery = true;

    try {
      // Set the visible input value
      locationQuery = q;

      // Use existing API to resolve the place
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const features = data.features ?? [];

      if (!features.length) {
        console.warn('No features returned for q=', q);
        return;
      }

      const first = features[0];

      selectedLocation = {
        label: first.label,
        lat: first.lat,
        lon: first.lon
      };

      // Hydrate radius from query or fall back to default
      const parsedDistance = distanceParam ? Number(distanceParam) : NaN;
      if (!Number.isNaN(parsedDistance) && parsedDistance > 0) {
        searchRadius = parsedDistance;
      }

      activeLocationFilter = {
        location: selectedLocation,
        radius: searchRadius
      };

    } catch (err) {
      console.error('❌ Error hydrating location from query params:', err);
    }
  })();

  // Calculate distance between two coordinates using Haversine formula
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  function passesLocationFilter(board: Board): boolean {
    if (!activeLocationFilter) return true;
    if (board.lat == null || board.lon == null) return false;

    const distance = calculateDistance(
      activeLocationFilter.location.lat,
      activeLocationFilter.location.lon,
      board.lat,
      board.lon
    );

    return distance <= activeLocationFilter.radius;
  }

</script>

<svelte:head>
  <title>Used Surfboards for Sale in NY &amp; NJ | QuiverShare</title>
  <meta name="description" content="Browse used surfboards for sale in New York and New Jersey. Filter by style, length, volume, and more on QuiverShare." />
  <link rel="canonical" href="https://www.quivershare.com/s" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Used Surfboards for Sale in NY & NJ | QuiverShare" />
  <meta property="og:description" content="Browse used surfboards for sale in New York and New Jersey. Filter by style, length, volume, and more on QuiverShare." />
  <meta property="og:url" content="https://www.quivershare.com/s" />
  <meta property="og:image" content="https://www.quivershare.com/FullLogo_Transparent_NoBuffer.png" />
  <meta property="og:site_name" content="QuiverShare" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Used Surfboards for Sale in NY & NJ | QuiverShare" />
  <meta name="twitter:description" content="Browse used surfboards for sale in New York and New Jersey. Filter by style, length, volume, and more on QuiverShare." />
  <meta name="twitter:image" content="https://www.quivershare.com/FullLogo_Transparent_NoBuffer.png" />
</svelte:head>

<svelte:window on:keydown={handleGlobalKeydown} />

<div class="min-h-screen bg-background">
  <div class="max-w-7xl mx-auto px-6 py-6">
    <div class="rounded-xl border border-border bg-surface-elevated/80 shadow-sm p-6 sm:p-8 mb-6">
      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        Used Surfboards for Sale in New York &amp; New Jersey
      </h1>
      <p class="max-w-2xl text-sm sm:text-base text-muted-foreground mt-3">
        Browse used surfboards for sale across New York and New Jersey. Find shortboards, fish, midlengths, and longboards listed by surfers throughout the Northeast.
      </p>
    </div>
    <div class="flex items-center justify-between gap-4 mb-4">
      <h3 class="text-xl font-semibold text-foreground">
        {displayedResultsCount} Results
        {#if hasActiveFilters}
          <span class="text-sm font-normal text-muted-foreground"> for {activeFilterLabels.join(' · ')}</span>
        {/if}
      </h3>
      <div class="flex items-center gap-2">
        <label for="sort-by-header" class="text-sm text-muted-foreground whitespace-nowrap">Sort:</label>
        <select
          id="sort-by-header"
          bind:value={sortBy}
          class="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          on:change={handleSortChange}
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">A-Z</option>
          <option value="name_desc">Z-A</option>
          <option value="created_asc">Oldest to Newest</option>
          <option value="created_desc">Newest to Oldest</option>
        </select>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-6">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-lg border border-border bg-surface-elevated/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        aria-expanded={isFiltersOpen}
        aria-controls="filters-drawer"
        on:click={openFiltersDrawer}
      >
        All Filters
      </button>
      {#if hasActiveFilters}
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          on:click={clearAllFilters}
        >
          Clear Filters
        </button>
      {/if}
    </div>

    {#if visibleBoards.length === 0}
      <div class="bg-surface-elevated/80 rounded-xl p-8 md:p-12 text-center border border-border shadow-sm">
        <p class="text-muted-foreground">No boards match your filters.</p>
      </div>
    {:else}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {#each visibleBoards as board, index (board.id)}
          <a
            href="/surfboards/{board.id}"
            data-sveltekit-prefetch
            class="block bg-surface-elevated/80 rounded-xl border border-border hover:border-primary/60 hover:shadow-lg transition-all duration-200 no-underline"
          >
            <div class="relative bg-muted rounded-t-xl overflow-hidden aspect-[3/4]">
              {#if board.image_url}
                {#if index < eagerImageCount}
                  <img
                    src={board.image_url}
                    alt={board.name}
                    class="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    fetchpriority="high"
                    decoding="async"
                  />
                {:else}
                  <img
                    src={board.image_url}
                    alt={board.name}
                    class="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                {/if}
              {:else}
                {#if index < eagerImageCount}
                  <img
                    src={placeholderThumbnail}
                    alt=""
                    class="absolute inset-0 w-full h-full object-cover"
                    aria-hidden="true"
                    loading="eager"
                    fetchpriority="high"
                    decoding="async"
                  />
                {:else}
                  <img
                    src={placeholderThumbnail}
                    alt=""
                    class="absolute inset-0 w-full h-full object-cover"
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                  />
                {/if}
              {/if}
            </div>
            <div class="p-3 md:p-4">
              <h3 class="text-base md:text-lg font-semibold text-foreground leading-tight line-clamp-2">{formatBoardTitle(board)}</h3>
              {#if board.make}
                <p class="text-sm text-muted-foreground mt-1 line-clamp-1">{board.make}</p>
              {/if}
              {#if board.style}
                <p class="text-sm text-muted-foreground mt-1">{displayStyle(board.style)}</p>
              {/if}
              {#if board.price}
                <p class="text-base font-semibold text-primary mt-2">${board.price}</p>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    {/if}

    {#if totalPages > 1}
      <div class="flex justify-center items-center gap-3 mt-8">
        <button
          class="inline-flex items-center justify-center rounded-lg border border-border bg-surface-elevated/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-elevated/50"
          disabled={currentPage === 1 || activeLocationFilter !== null}
          on:click={() => goToPage(currentPage - 1)}
        >
          Previous
        </button>
        <span class="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <button
          class="inline-flex items-center justify-center rounded-lg border border-border bg-surface-elevated/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-elevated/50"
          disabled={currentPage === totalPages || activeLocationFilter !== null}
          on:click={() => goToPage(currentPage + 1)}
        >
          Next
        </button>
      </div>
    {/if}

    <section class="rounded-xl border border-border bg-surface-elevated/80 shadow-sm p-6 sm:p-8 mt-12">
      <h2 class="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
        Buying Used Surfboards in New York &amp; New Jersey
      </h2>
      <p class="mt-3 max-w-3xl text-sm sm:text-base text-muted-foreground">
        The Northeast has a growing surf community, and used surfboards are one of the best ways to build a quiver without spending thousands on new boards. Surfers across New York and New Jersey regularly buy and sell shortboards, fish, midlengths, and longboards as they experiment with different shapes and wave conditions.
      </p>
      <p class="mt-3 max-w-3xl text-sm sm:text-base text-muted-foreground">
        QuiverShare helps surfers discover boards that might otherwise be buried in local marketplaces. Every listing links directly to the original seller so you can contact them and arrange the purchase locally.
      </p>
    </section>
  </div>

  {#if isFiltersOpen}
    <button
      type="button"
      class="fixed inset-0 z-40 bg-black/50"
      aria-label="Close filters"
      on:click={closeFiltersDrawer}
    ></button>

    <div
      id="filters-drawer"
      class="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-surface-elevated border-r border-border shadow-xl overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="All filters"
    >
      <div class="p-4 border-b border-border flex items-center justify-between">
        <h2 class="text-lg font-semibold text-foreground">All Filters</h2>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-elevated"
          aria-label="Close filters"
          on:click={closeFiltersDrawer}
        >
          X
        </button>
      </div>

      <div class="p-4 space-y-6">
        <div class="bg-surface-elevated/80 rounded-xl p-4 border border-border shadow-sm">
          <label for="drawer-location-search" class="block mb-2">
            <span class="font-medium text-sm text-foreground">Search Location</span>
          </label>
          <div class="relative">
            <input
              id="drawer-location-search"
              type="text"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              placeholder="Enter location..."
              value={locationQuery}
              on:input={onLocationSearchInput}
              autocomplete="off"
              aria-autocomplete="list"
              aria-controls="drawer-location-suggestions-list"
            />
            {#if locationSuggestions.length > 0}
              <ul id="drawer-location-suggestions-list" class="absolute left-0 right-0 z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg backdrop-blur-sm">
                {#each locationSuggestions as s}
                  <li>
                    <button type="button" class="flex w-full items-center px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg" on:click={() => chooseLocationSuggestion(s)}>
                      {s.label}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <div class="mt-4">
            <label for="drawer-search-radius" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Within</span>
            </label>
            <div class="flex items-center gap-3">
              <input
                id="drawer-search-radius"
                type="number"
                min="1"
                max="500"
                bind:value={searchRadius}
                class="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
              <span class="text-sm text-muted-foreground whitespace-nowrap">miles</span>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex w-full items-center justify-center rounded-lg border border-border bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-alt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            disabled={!selectedLocation}
            on:click={() => {
              if (!selectedLocation) return;
              if (!selectedLocation.lat || !selectedLocation.lon) return;

              activeLocationFilter = {
                location: selectedLocation,
                radius: searchRadius
              };
            }}
          >
            Apply Location Search
          </button>
          {#if activeLocationFilter}
            <div class="mt-4 p-3 bg-primary-soft/30 rounded-lg border border-primary/20">
              <div class="text-foreground font-medium mb-2 text-xs">
                Active: {activeLocationFilter.radius} miles from {activeLocationFilter.location.label}
              </div>
              <a
                href="/s"
                data-sveltekit-reload
                class="inline-flex w-full items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-elevated"
              >
                Clear Location Filter
              </a>
            </div>
          {:else if selectedLocation}
            <div class="mt-4 text-xs text-muted-foreground">
              Ready to search within {searchRadius} miles of {selectedLocation.label}
            </div>
          {/if}
        </div>

        <div class="bg-surface-elevated/80 rounded-xl p-4 space-y-4 border border-border shadow-sm">
          <h3 class="font-semibold text-lg text-foreground">Filters</h3>

          <div>
            <label for="drawer-filter-length" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Length</span>
            </label>
            <select
              id="drawer-filter-length"
              bind:value={selectedLength}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              on:change={handleLengthChange}
            >
              <option value={null}>All</option>
              {#each lengthOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="drawer-filter-volume" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Volume</span>
            </label>
            <select
              id="drawer-filter-volume"
              bind:value={selectedVolume}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              on:change={handleVolumeChange}
            >
              <option value={null}>All</option>
              {#each volumeOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="drawer-filter-fin-system" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Fin System</span>
            </label>
            <select
              id="drawer-filter-fin-system"
              bind:value={selectedFinSystem}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              on:change={handleFinSystemChange}
            >
              <option value={null}>All</option>
              {#each finSystemOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="drawer-filter-fin-setup" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Fin Setup</span>
            </label>
            <select
              id="drawer-filter-fin-setup"
              bind:value={selectedFinSetup}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              on:change={handleFinSetupChange}
            >
              <option value={null}>All</option>
              {#each finSetupOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="drawer-filter-style" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Style</span>
            </label>
            <select
              id="drawer-filter-style"
              bind:value={selectedStyle}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              on:change={handleStyleChange}
            >
              <option value={null}>All</option>
              {#each styleOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <a
            href="/s"
            data-sveltekit-reload
            class="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-elevated mt-2"
          >
            Clear Filters
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>
