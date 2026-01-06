<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { browser } from '$app/environment';
  import { pageTitle } from '$lib/title';

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
    thumbnail_url: string | null;
    is_curated?: boolean | null;
    images?: string[] | null;
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
  let allBoards: Board[] = data.boards ?? [];
  let filteredBoards: Board[] = [...allBoards];
  let sortBy: SortOption = (data.sort ?? 'created_desc') as SortOption;
  let currentPage = data.page ?? 1;
  let totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.limit || 1)));
  const currentUserId = data.userId;

  $: if (data.boards) {
    allBoards = data.boards ?? [];
  }

  $: currentPage = data.page ?? 1;
  $: totalPages = Math.max(1, Math.ceil((data.total ?? 0) / (data.limit || 1)));

  function updateQueryParams(params: Record<string, string | null>) {
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
    goto(target, { replaceState: true, keepFocus: true, noScroll: true });
  }

  function handleSortChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as SortOption;
    updateQueryParams({ sort: value, page: '1' });
  }

  function goToPage(newPage: number) {
    if (newPage < 1 || newPage > totalPages) return;
    updateQueryParams({ page: String(newPage) });
  }

  function handleEditClick(event: MouseEvent, boardId: string, isCurated?: boolean | null) {
    event.preventDefault();
    event.stopPropagation();
    if (isCurated === true) {
      goto(`/admin/curated-boards/${boardId}`);
    } else {
      goto(`/edit-surfboard/${boardId}`);
    }
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

  const volumeOptions = [
    "<25L",
    "25L-30L",
    "30L-35L",
    "35L-40L",
    "40L-45L",
    "45L-50L",
    "More"
  ];

  const finSystemOptions = ["FCS II", "Futures", "Glass On", "FCS"];
  const finSetupOptions = ["2+1", "Twin", "4+1", "Quad", "Single", "Tri", "Tri/Quad", "More"];
  const styleOptions = ["Shortboard", "Mid-length", "Longboard", "Groveler", "Gun"];

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
      console.log('🌐 Hydrating location filter from query params:', { q, distanceParam });

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

      console.log('✅ Active location filter hydrated from query:', activeLocationFilter);

      // Apply filters with this new activeLocationFilter
      applyFilters();
      console.log('filteredBoards after hydration:', filteredBoards.length);
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

  // Filter functions
  function matchesLength(board: Board, filter: string | null): boolean {
    if (!filter || filter === 'More') return true;
    if (!board.length) return false;
    
    const inches = board.length;
    
    if (filter === "5'6\"-6'0\"") return inches >= 66 && inches < 72;
    if (filter === "6'0\"-6'6\"") return inches >= 72 && inches < 78;
    if (filter === "6'6\"-7'0\"") return inches >= 78 && inches < 84;
    if (filter === "7'0\"-8'0\"") return inches >= 84 && inches < 96;
    if (filter === "8'0\"-9'0\"") return inches >= 96 && inches < 108;
    if (filter === "9'0\"-10'0\"") return inches >= 108 && inches < 120;
    if (filter === 'More') return inches >= 120;
    
    return true;
  }

  function matchesVolume(board: Board, filter: string | null): boolean {
    if (!filter || filter === 'More') return true;
    if (!board.volume) return false;
    
    if (filter === "<25L") return board.volume < 25;
    if (filter === "25L-30L") return board.volume >= 25 && board.volume < 30;
    if (filter === "30L-35L") return board.volume >= 30 && board.volume < 35;
    if (filter === "35L-40L") return board.volume >= 35 && board.volume < 40;
    if (filter === "40L-45L") return board.volume >= 40 && board.volume < 45;
    if (filter === "45L-50L") return board.volume >= 45 && board.volume < 50;
    if (filter === "More") return board.volume >= 50;
    
    return true;
  }

  function applyFilters() {
    filteredBoards = allBoards.filter((board) => {
      if (activeLocationFilter) {
        if (board.lat == null || board.lon == null) {
          return false;
        }

        const distance = calculateDistance(
          activeLocationFilter.location.lat,
          activeLocationFilter.location.lon,
          board.lat,
          board.lon
        );

        if (distance > activeLocationFilter.radius) {
          return false;
        }
      }

      if (selectedLength && !matchesLength(board, selectedLength)) return false;
      if (selectedVolume && !matchesVolume(board, selectedVolume)) return false;
      if (selectedFinSystem && board.fin_system !== selectedFinSystem) return false;
      if (selectedFinSetup && board.fin_setup !== selectedFinSetup) return false;
      if (selectedStyle && board.style !== selectedStyle) return false;

      return true;
    });

    applySort();
  }

  function applySort() {
    const sorted = [...filteredBoards];
    
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'created_asc':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'created_desc':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    
    filteredBoards = sorted;
  }

  // Watch for filter changes
  $: if (selectedLength !== null || selectedVolume !== null || selectedFinSystem !== null || 
         selectedFinSetup !== null || selectedStyle !== null || activeLocationFilter !== null) {
    console.log('🔄 Reactive filter update triggered');
    applyFilters();
  }

  // Watch for sort changes
  $: if (sortBy) {
    applySort();
  }

  // Format length
  function formatLength(inches: number | null): string {
    if (!inches) return 'N/A';
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  }
</script>

<svelte:head>
  <title>{pageTitle('Browse Boards')}</title>
</svelte:head>

<div class="min-h-screen bg-background">
  <!-- Mobile Filter Bar (mobile only) -->
  <div class="block lg:hidden bg-surface-elevated/80 border-b border-border px-4 py-3">
    <div class="max-w-7xl mx-auto space-y-3">
      <!-- Location + Radius Row -->
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <input
            type="text"
            class="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            placeholder="Location"
            value={locationQuery}
            on:input={onLocationSearchInput}
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="mobile-location-suggestions-list"
          />
          {#if locationSuggestions.length > 0}
            <ul id="mobile-location-suggestions-list" class="absolute left-0 right-0 z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg backdrop-blur-sm">
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
        <div class="w-20">
          <input
            type="number"
            min="1"
            max="500"
            bind:value={searchRadius}
            class="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            placeholder="mi"
          />
        </div>
        {#if selectedLocation}
          <button
            type="button"
            class="px-3 py-2 rounded-lg border border-border bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-alt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors whitespace-nowrap"
            on:click={() => {
              if (selectedLocation && selectedLocation.lat && selectedLocation.lon) {
                activeLocationFilter = {
                  location: selectedLocation,
                  radius: searchRadius
                };
                applyFilters();
              }
            }}
          >
            Apply
          </button>
        {/if}
      </div>
      
      <!-- Filter Dropdowns Row -->
      <div class="grid grid-cols-3 gap-2">
        <select
          bind:value={selectedLength}
          class="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        >
          <option value={null}>Length</option>
          {#each lengthOptions as opt}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
        <select
          bind:value={selectedVolume}
          class="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        >
          <option value={null}>Volume</option>
          {#each volumeOptions as opt}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
        <select
          bind:value={selectedStyle}
          class="w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        >
          <option value={null}>Style</option>
          {#each styleOptions as opt}
            <option value={opt}>{opt}</option>
          {/each}
        </select>
      </div>
      
      {#if activeLocationFilter}
        <div class="text-xs text-muted-foreground">
          Active: {activeLocationFilter.radius}mi from {activeLocationFilter.location.label}
          <a href="/s" data-sveltekit-reload class="ml-2 text-primary hover:underline">Clear</a>
        </div>
      {/if}
      
      <!-- Sort By (mobile) -->
      <div class="flex items-center gap-2 pt-2 border-t border-border">
        <label for="sort-by-mobile" class="text-xs text-muted-foreground whitespace-nowrap">Sort:</label>
        <select
          id="sort-by-mobile"
          bind:value={sortBy}
          class="flex-1 rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
  </div>

  <!-- Main Content: 2-column layout -->
  <div class="max-w-7xl mx-auto px-6 py-6">
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Left: Filters (sticky on desktop, hidden on mobile) -->
      <aside class="hidden lg:block lg:w-64 lg:sticky lg:top-6 lg:self-start space-y-4">
        <!-- Location Search -->
        <div class="bg-surface-elevated/80 rounded-xl p-4 md:p-5 border border-border shadow-sm">
          <label for="location-search" class="block mb-2">
            <span class="font-medium text-sm text-foreground">Search Location</span>
          </label>
          <div class="relative">
            <input
              id="location-search"
              type="text"
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              placeholder="Enter location..."
              value={locationQuery}
              on:input={onLocationSearchInput}
              autocomplete="off"
              aria-autocomplete="list"
              aria-controls="location-suggestions-list"
            />
            {#if locationSuggestions.length > 0}
              <ul id="location-suggestions-list" class="absolute left-0 right-0 z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg backdrop-blur-sm">
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
            <label for="search-radius" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Within</span>
            </label>
            <div class="flex items-center gap-3">
              <input
                id="search-radius"
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
              try {
                console.log('=== Apply Location Search Clicked ===');
                console.log('selectedLocation:', selectedLocation);
                console.log('searchRadius:', searchRadius);
                console.log('allBoards count:', allBoards.length);
                console.log('filteredBoards count (before):', filteredBoards.length);
                
                if (!selectedLocation) {
                  console.error('❌ No location selected!');
                  return;
                }

                if (!selectedLocation.lat || !selectedLocation.lon) {
                  console.error('❌ Location missing coordinates:', selectedLocation);
                  return;
                }

                // Calculate distance for each board (if boards had lat/lon)
                // For now, just log what we would filter
                console.log('📍 Filter center:', {
                  label: selectedLocation.label,
                  lat: selectedLocation.lat,
                  lon: selectedLocation.lon,
                  radius: searchRadius
                });

                // Set active filter
                activeLocationFilter = {
                  location: selectedLocation,
                  radius: searchRadius
                };

                console.log('✅ Active location filter set:', activeLocationFilter);
                
                // Trigger filter update
                console.log('🔄 Triggering filter update...');
                applyFilters();
                
                console.log('filteredBoards count (after):', filteredBoards.length);
                console.log('=== End Location Search ===');
              } catch (error) {
                console.error('❌ Error applying location search:', error);
                console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
              }
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

        <!-- Filters -->
        <div class="bg-surface-elevated/80 rounded-xl p-4 md:p-5 space-y-4 border border-border shadow-sm">
          <h2 class="font-semibold text-lg mb-4 text-foreground">Filters</h2>

          <!-- Length Filter -->
          <div>
            <label for="filter-length" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Length</span>
            </label>
            <select
              id="filter-length"
              bind:value={selectedLength}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value={null}>All</option>
              {#each lengthOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <!-- Volume Filter -->
          <div>
            <label for="filter-volume" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Volume</span>
            </label>
            <select
              id="filter-volume"
              bind:value={selectedVolume}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value={null}>All</option>
              {#each volumeOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <!-- Fin System Filter -->
          <div>
            <label for="filter-fin-system" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Fin System</span>
            </label>
            <select
              id="filter-fin-system"
              bind:value={selectedFinSystem}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value={null}>All</option>
              {#each finSystemOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <!-- Fin Setup Filter -->
          <div>
            <label for="filter-fin-setup" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Fin Setup</span>
            </label>
            <select
              id="filter-fin-setup"
              bind:value={selectedFinSetup}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value={null}>All</option>
              {#each finSetupOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <!-- Style Filter -->
          <div>
            <label for="filter-style" class="block mb-2">
              <span class="font-medium text-sm text-foreground">Style</span>
            </label>
            <select
              id="filter-style"
              bind:value={selectedStyle}
              class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            >
              <option value={null}>All</option>
              {#each styleOptions as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          </div>

          <!-- Clear Filters -->
          <a
            href="/s"
            data-sveltekit-reload
            class="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-elevated mt-4"
          >
            Clear Filters
          </a>
        </div>

        <!-- Sort By (desktop) -->
        <div class="bg-surface-elevated/80 rounded-xl p-4 md:p-5 border border-border shadow-sm">
          <label for="sort-by-desktop" class="block mb-2">
            <span class="font-medium text-sm text-foreground">Sort By</span>
          </label>
          <select
            id="sort-by-desktop"
            bind:value={sortBy}
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
      </aside>

      <!-- Right: Board Cards -->
      <main class="flex-1">
        <div class="space-y-4">
          {#if filteredBoards.length === 0}
            <div class="bg-surface-elevated/80 rounded-xl p-8 md:p-12 text-center border border-border shadow-sm">
              <p class="text-muted-foreground">No boards match your filters.</p>
            </div>
          {:else}
            {#each filteredBoards as board (board.id)}
              <a
                href="/surfboards/{board.id}"
                data-sveltekit-prefetch
                class="block bg-surface-elevated/80 rounded-xl border border-border hover:border-primary/60 hover:shadow-md transition-all duration-200 no-underline"
              >
                <div class="flex flex-col md:flex-row">
                  <!-- Left: Photo Carousel -->
                  <div class="md:w-56 flex-shrink-0 relative bg-muted rounded-t-xl md:rounded-l-xl md:rounded-tr-none overflow-hidden aspect-[3/4] min-h-[160px]">
                    {#if board.images && board.images.length > 0}
                      {#each board.images as img, index}
                        <img
                          src={img}
                          alt={board.name}
                          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 {index === 0 ? 'opacity-100' : 'opacity-0'}"
                          loading="lazy"
                        />
                      {/each}
                      
                      {#if board.images.length > 1}
                        <!-- Navigation arrows -->
                        <button
                          type="button"
                          class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                          on:click|stopPropagation={(e) => {
                            e.preventDefault();
                            // prevImage(board.id, board.images.length); // This function is removed
                          }}
                        >
                          <span class="text-sm">‹</span>
                        </button>
                        <button
                          type="button"
                          class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
                          on:click|stopPropagation={(e) => {
                            e.preventDefault();
                            // nextImage(board.id, board.images.length); // This function is removed
                          }}
                        >
                          <span class="text-sm">›</span>
                        </button>
                        
                        <!-- Dot indicators -->
                        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {#each board.images as _, index}
                            <div
                              class="w-2 h-2 rounded-full {index === 0 ? 'bg-white' : 'bg-white/50'}"
                            ></div>
                          {/each}
                        </div>
                      {/if}
                    {:else if board.thumbnail_url}
                      <img
                        src={board.thumbnail_url}
                        alt={board.name}
                        class="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    {:else}
                      <img
                        src={placeholderThumbnail}
                        alt=""
                        class="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        aria-hidden="true"
                      />
                    {/if}
                  </div>

                  <!-- Right: Metadata -->
                  <div class="flex-1 p-5 md:p-6 flex flex-col justify-between">
                    <div>
                      <div class="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 class="text-xl font-bold text-foreground">{board.name}</h3>
                          {#if board.make}
                            <p class="text-sm text-muted-foreground mt-1">{board.make}</p>
                          {/if}
                        </div>
                        {#if currentUserId && board.user_id === currentUserId}
                          <button
                            type="button"
                            class="inline-flex items-center rounded-lg border border-border bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-alt shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-elevated"
                            on:click={(event) => handleEditClick(event, board.id, board.is_curated)}
                            aria-label="Edit {board.name}"
                          >
                            Edit
                          </button>
                        {/if}
                      </div>
                      
                      <div class="flex flex-wrap gap-4 text-sm mb-4 text-foreground">
                        {#if board.price}
                          <span class="font-semibold text-primary">${board.price}</span>
                        {/if}
                        {#if board.length}
                          <span>{formatLength(board.length)}</span>
                        {/if}
                        {#if board.width}
                          <span>{board.width}" wide</span>
                        {/if}
                        {#if board.thickness}
                          <span>{board.thickness}" thick</span>
                        {/if}
                        {#if board.volume}
                          <span>{board.volume}L</span>
                        {/if}
                      </div>

                      <div class="flex flex-wrap gap-2 text-xs mb-4">
                        {#if board.fin_system}
                          <span class="inline-flex items-center px-2 py-1 rounded-md border border-border bg-surface text-muted-foreground">{board.fin_system}</span>
                        {/if}
                        {#if board.fin_setup}
                          <span class="inline-flex items-center px-2 py-1 rounded-md border border-border bg-surface text-muted-foreground">{board.fin_setup}</span>
                        {/if}
                        {#if board.style}
                          <span class="inline-flex items-center px-2 py-1 rounded-md border border-border bg-surface text-muted-foreground">{board.style}</span>
                        {/if}
                        {#if board.condition}
                          <span class="inline-flex items-center px-2 py-1 rounded-md border border-border bg-surface text-muted-foreground">{board.condition}</span>
                        {/if}
                      </div>

                      {#if board.city || board.region}
                        <p class="text-sm text-muted-foreground">
                          {[board.city, board.region].filter(Boolean).join(', ')}
                        </p>
                      {/if}
                    </div>
                  </div>
                </div>
              </a>
            {/each}
          {/if}
        </div>
        {#if totalPages > 1}
          <div class="flex justify-center items-center gap-3 mt-8">
            <button
              class="inline-flex items-center justify-center rounded-lg border border-border bg-surface-elevated/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-elevated/50"
              disabled={currentPage === 1}
              on:click={() => goToPage(currentPage - 1)}
            >
              Previous
            </button>
            <span class="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              class="inline-flex items-center justify-center rounded-lg border border-border bg-surface-elevated/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-surface-elevated/50"
              disabled={currentPage === totalPages}
              on:click={() => goToPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        {/if}
      </main>
    </div>
  </div>
</div>
