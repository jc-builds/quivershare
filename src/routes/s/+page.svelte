<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  // Types
  type Quiver = {
    id: string;
    username: string;
    avatar_url: string | null;
    homebreak: string | null;
    favorite_board: string | null;
    lat: number | null;
    lng: number | null;
  };

  type MapBounds = {
    north: number;
    south: number;
    east: number;
    west: number;
  };

  // State
  let searchQuery = '';
  let searchSuggestions: Array<{ id: string; label: string; lat: number; lon: number }> = [];
  let selectedPlace: { label: string; lat: number; lon: number } | null = null;
  
  let quivers: Quiver[] = [];
  let filteredQuivers: Quiver[] = [];
  let loading = false;
  let error: string | null = null;
  let selectedQuiverId: string | null = null;
  let hoveredQuiverId: string | null = null;
  
  
  // Map state
  let map: any = null;
  let mapMarkers: Map<string, any> = new Map();
  let mapBounds: MapBounds | null = null;
  let mapDebounceTimer: any = null;
  let mapboxToken: string | null = null;
  let resizeHandler: (() => void) | null = null;

  // Load Mapbox GL JS
  onMount(async () => {
    // Load Mapbox GL JS if not already loaded
    if (!(window as any).mapboxgl) {
      await new Promise<void>((resolve) => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        const script = document.createElement('script');
        script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }
    
    // Fetch Mapbox token
    try {
      const res = await fetch('/api/mapbox-token');
      const data = await res.json();
      mapboxToken = data.token;
      if ((window as any).mapboxgl) {
        (window as any).mapboxgl.accessToken = mapboxToken;
      }
    } catch (e) {
      console.error('Failed to load Mapbox token:', e);
    }
    
    // Load from URL params
    const params = $page.url.searchParams;
    const place = params.get('place');
    
    if (place) {
      searchQuery = place;
      await searchLocation(place);
    } else {
      // Try to auto-locate
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        await initializeMap(position.coords.latitude, position.coords.longitude, 10);
      } catch (e) {
        // Default to US center
        await initializeMap(39.8283, -98.5795, 4);
      }
    }
    
    await fetchQuivers();
  });

  // Cleanup on component destroy
  onDestroy(() => {
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
    }
    if (map) {
      map.remove();
    }
  });

  // Debounced search
  let searchDebounceTimer: any;
  async function onSearchInput(e: Event) {
    const query = (e.target as HTMLInputElement).value;
    searchQuery = query;
    searchSuggestions = [];
    
    clearTimeout(searchDebounceTimer);
    if (query.length < 2) return;
    
    searchDebounceTimer = setTimeout(async () => {
      await searchPlaces(query);
    }, 300);
  }

  async function searchPlaces(q: string) {
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      searchSuggestions = data.features || [];
    } catch (e) {
      console.error('Search error:', e);
    }
  }

  async function selectPlace(place: { id: string; label: string; lat: number; lon: number }) {
    console.log('Selecting place:', place);
    searchQuery = place.label;
    selectedPlace = { label: place.label, lat: place.lat, lon: place.lon };
    searchSuggestions = [];
    // Use a lower zoom level for states/regions (6), higher for cities (12-14)
    // Check if it's a state/region (fewer commas) vs a city (more commas)
    const isCity = place.label.split(',').length >= 3;
    const zoom = isCity ? 12 : 6; // States get zoom 6, cities get zoom 12
    await initializeMap(place.lat, place.lon, zoom);
    await updateURLParams();
    await fetchQuivers();
  }

  async function searchLocation(query: string) {
    console.log('Searching location:', query);
    await searchPlaces(query);
    console.log('Search suggestions:', searchSuggestions);
    if (searchSuggestions.length > 0) {
      await selectPlace(searchSuggestions[0]);
    } else {
      console.warn('No search suggestions found for:', query);
    }
  }

  async function initializeMap(lat: number, lon: number, zoom: number = 10) {
    if (typeof window === 'undefined') return;
    
    // Wait for Mapbox GL to be available
    if (!(window as any).mapboxgl) {
      await new Promise(resolve => {
        const checkMapbox = setInterval(() => {
          if ((window as any).mapboxgl) {
            clearInterval(checkMapbox);
            resolve(null);
          }
        }, 100);
      });
    }
    
    const mapboxgl = (window as any).mapboxgl;
    
    // Use cached token or fetch if needed
    if (!mapboxToken) {
      try {
        const res = await fetch('/api/mapbox-token');
        const data = await res.json();
        mapboxToken = data.token;
      } catch (e) {
        console.error('Failed to load Mapbox token:', e);
        return;
      }
    }
    
    mapboxgl.accessToken = mapboxToken;
    
    if (map) {
      map.remove();
    }
    
    // Wait for DOM container to be ready (with retries)
    // Desktop only - always use map-container
    const containerId = 'map-container';
    
    console.log('Looking for map container:', containerId, 'Window width:', window.innerWidth);
    
    // Ensure the map panel is visible
    const mapPanel = document.getElementById('map-panel');
    if (mapPanel) {
      mapPanel.classList.remove('hidden');
      mapPanel.style.display = 'flex';
      mapPanel.style.flexDirection = 'column';
      // Force a layout recalculation
      void mapPanel.offsetHeight;
      console.log('✅ Forced map panel visibility');
    }
    // Wait a tick for layout to settle
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log('All elements with id containing map:', Array.from(document.querySelectorAll('[id*="map"]')).map(el => ({ id: el.id, visible: el.offsetWidth > 0 })));
    
    let container = document.getElementById(containerId);
    let retries = 0;
    
    while (!container && retries < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      container = document.getElementById(containerId);
      retries++;
      if (retries % 5 === 0) {
        console.log(`Retry ${retries}/30: Looking for ${containerId}...`);
      }
    }
    
    if (!container) {
      console.error(`❌ Map container ${containerId} not found after ${retries} retries`);
      console.error('Available elements:', document.querySelectorAll('[id*="map"]'));
      console.error('Page HTML structure:', document.querySelector('.flex-1.flex.flex-col')?.outerHTML);
      return;
    }
    
    // Wait for container to have dimensions - keep retrying until it does
    let width = 0;
    let height = 0;
    let dimensionRetries = 0;
    
    while ((width === 0 || height === 0) && dimensionRetries < 30) {
      width = container.offsetWidth || container.clientWidth || 0;
      height = container.offsetHeight || container.clientHeight || 0;
      
      if (width === 0 || height === 0) {
        console.log(`Waiting for container dimensions... (${dimensionRetries}/30)`, {
          offsetWidth: container.offsetWidth,
          offsetHeight: container.offsetHeight,
          clientWidth: container.clientWidth,
          clientHeight: container.clientHeight,
          parentWidth: (container.parentElement as HTMLElement)?.offsetWidth,
          parentHeight: (container.parentElement as HTMLElement)?.offsetHeight
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        dimensionRetries++;
      }
    }
    
    console.log('✅ Map container found:', container, 'Dimensions:', width, 'x', height);
    
    if (width === 0 || height === 0) {
      console.error('❌ Map container still has zero dimensions after waiting!', {
        container: container,
        parent: container.parentElement,
        computedStyle: window.getComputedStyle(container),
        parentComputedStyle: container.parentElement ? window.getComputedStyle(container.parentElement) : null
      });
      
      // Force dimensions as fallback - use viewport-based calculations
      const parent = container.parentElement as HTMLElement;
      if (parent) {
        // Calculate based on viewport
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const searchBarHeight = 80; // Approximate search bar height
        // Get parent's actual height or calculate from viewport
        const parentWidth = 575; // Fixed width as requested
        const parentHeight = parent.offsetHeight || window.innerHeight - 180; // Account for navbar and search bar
        
        // Force parent dimensions first - ensure it's visible
        const computedStyle = window.getComputedStyle(parent);
        console.log('Parent before:', {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          width: parent.offsetWidth,
          height: parent.offsetHeight,
          parentParent: parent.parentElement
        });
        
        // Remove hidden class if present and ensure it's visible
        parent.classList.remove('hidden');
        // Use flex to match the parent flex container
        parent.style.display = 'flex';
        parent.style.flexDirection = 'column';
        parent.style.visibility = 'visible';
        parent.style.height = `${parentHeight}px`;
        parent.style.minHeight = `${parentHeight}px`;
        parent.style.width = `${parentWidth}px`;
        parent.style.position = 'relative';
        parent.style.flexShrink = '0';
        
        // Force a reflow
        void parent.offsetHeight;
        
        // Then force container dimensions
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.position = 'relative';
        container.style.display = 'block';
        
        // Force another reflow
        void container.offsetHeight;
        
        width = parentWidth;
        height = parentHeight;
        
        console.log('⚠️ Forced container dimensions:', width, 'x', height);
        console.log('Parent dimensions set to:', parent.offsetWidth, 'x', parent.offsetHeight);
      } else {
        console.error('❌ No parent element found!');
        return;
      }
    }
    
    try {
      map = new mapboxgl.Map({
        container: containerId,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [lon, lat],
        zoom: zoom
      });
      
      console.log('Map instance created, waiting for load...');
      
      map.on('load', () => {
        console.log('✅ Map loaded successfully');
        // Set initial map bounds
        const bounds = map.getBounds();
        mapBounds = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        };
        // Apply filters and update pins with initial bounds
        applyFilters();
        updateMapPins();
        // Trigger resize after load to ensure proper rendering
        setTimeout(() => {
          if (map) {
            map.resize();
            console.log('Map resized after load');
          }
        }, 100);
      });
      
      map.on('error', (e: any) => {
        console.error('Map error:', e);
      });
      
      map.on('moveend', () => {
        if (map) {
          const bounds = map.getBounds();
          mapBounds = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          };
          
          clearTimeout(mapDebounceTimer);
          mapDebounceTimer = setTimeout(async () => {
            await updateURLParams();
            await fetchQuivers();
          }, 500);
        }
      });
      
      // Handle window resize to recalculate map size
      resizeHandler = () => {
        if (map) {
          setTimeout(() => {
            map.resize();
          }, 100);
        }
      };
      
      window.addEventListener('resize', resizeHandler);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  async function fetchQuivers() {
    loading = true;
    error = null;
    
    try {
      // Mock data function - replace with real API call
      const results = await getMockQuivers(mapBounds);
      quivers = results;
      console.log('✅ Fetched quivers:', quivers.length);
      applyFilters();
      console.log('✅ After filtering, filteredQuivers:', filteredQuivers.length);
    } catch (e) {
      error = 'Failed to load quivers. Please try again.';
      console.error('Fetch error:', e);
    } finally {
      loading = false;
    }
  }

  function applyFilters() {
    // If no map bounds yet, show all quivers (for initial load)
    if (!mapBounds) {
      filteredQuivers = quivers;
      console.log('No map bounds, showing all quivers:', quivers.length);
    } else {
      // Expand bounds significantly (50% buffer) to include nearby quivers
      const latRange = mapBounds.north - mapBounds.south;
      const lngRange = mapBounds.east - mapBounds.west;
      const latBuffer = latRange * 0.5; // 50% buffer
      const lngBuffer = lngRange * 0.5; // 50% buffer
      
      const expandedBounds = {
        north: mapBounds.north + latBuffer,
        south: mapBounds.south - latBuffer,
        east: mapBounds.east + lngBuffer,
        west: mapBounds.west - lngBuffer
      };
      
      filteredQuivers = quivers.filter(q => {
        // If quiver has no coordinates, show it anyway
        if (!q.lat || !q.lng) return true;
        // Filter by expanded map bounds
        if (q.lat > expandedBounds.north || q.lat < expandedBounds.south ||
            q.lng > expandedBounds.east || q.lng < expandedBounds.west) return false;
        return true;
      });
      console.log('Filtered quivers by bounds:', filteredQuivers.length, 'out of', quivers.length);
      console.log('Map bounds:', mapBounds);
      console.log('Expanded bounds:', expandedBounds);
    }
    
    updateMapPins();
  }

  function updateMapPins() {
    if (!map || !map.loaded()) return;
    
    // Clear existing markers
    mapMarkers.forEach(marker => marker.remove());
    mapMarkers.clear();
    
    filteredQuivers.forEach(quiver => {
      if (!quiver.lat || !quiver.lng) return;
      
      const el = document.createElement('div');
      el.className = 'quiver-pin';
      const isSelected = selectedQuiverId === quiver.id;
      const isHovered = hoveredQuiverId === quiver.id;
      const scale = isSelected || isHovered ? 'scale-125' : '';
      const ring = isSelected ? 'ring-4 ring-primary ring-offset-2' : '';
      
      el.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center transition-transform ${scale} ${ring}">
          <span class="text-white text-xs font-bold">🏄</span>
        </div>
      `;
      el.setAttribute('aria-label', `Quiver: ${quiver.username}, ${quiver.homebreak || 'No homebreak'}`);
      
      const marker = new (window as any).mapboxgl.Marker({ 
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([quiver.lng, quiver.lat])
        .addTo(map);
      
      el.addEventListener('click', () => {
        selectQuiver(quiver.id);
      });
      
      el.addEventListener('mouseenter', () => {
        hoveredQuiverId = quiver.id;
        updateMapPins(); // Re-render to show hover state
      });
      
      el.addEventListener('mouseleave', () => {
        hoveredQuiverId = null;
        updateMapPins(); // Re-render to hide hover state
      });
      
      mapMarkers.set(quiver.id, marker);
    });
  }
  
  // Watch for selection changes to update pins
  $: if (selectedQuiverId !== null && map) {
    updateMapPins();
  }

  function selectQuiver(id: string) {
    selectedQuiverId = id;
    const quiver = filteredQuivers.find(q => q.id === id);
    if (quiver && quiver.lat && quiver.lng && map) {
      map.flyTo({ center: [quiver.lng, quiver.lat], zoom: 14 });
    }
    scrollToQuiver(id);
  }

  function scrollToQuiver(id: string) {
    const element = document.getElementById(`quiver-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        if (selectedQuiverId !== id) {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }
      }, 2000);
    }
  }

  async function updateURLParams() {
    const params = new URLSearchParams();
    if (selectedPlace) {
      params.set('place', selectedPlace.label);
    }
    
    goto(`/s?${params.toString()}`, { replaceState: true, keepFocus: true });
  }

  function clearFilters() {
    applyFilters();
    updateURLParams();
  }

  // Mock data function
  async function getMockQuivers(bounds: MapBounds | null): Promise<Quiver[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Generate mock quivers - return all, let applyFilters handle the filtering
    const mockQuivers: Quiver[] = [
      {
        id: '1',
        username: 'surfpro123',
        avatar_url: null,
        homebreak: 'Trestles',
        favorite_board: 'Album Twinsman',
        lat: 33.3831,
        lng: -117.5883
      },
      {
        id: '2',
        username: 'barrelchaser',
        avatar_url: null,
        homebreak: 'Pipeline',
        favorite_board: 'JS Blak Box 3',
        lat: 21.6617,
        lng: -158.0533
      },
      {
        id: '3',
        username: 'loglover',
        avatar_url: null,
        homebreak: 'Malibu',
        favorite_board: '9\'0" Traditional',
        lat: 34.0319,
        lng: -118.6758
      },
      {
        id: '4',
        username: 'eastcoast',
        avatar_url: null,
        homebreak: 'Rockaway',
        favorite_board: 'Firewire Seaside',
        lat: 40.5789,
        lng: -73.8157
      },
      {
        id: '5',
        username: 'montauk',
        avatar_url: null,
        homebreak: 'Ditch Plains',
        favorite_board: 'Channel Islands Twin Pin',
        lat: 41.0417,
        lng: -71.8575
      }
    ];
    
    // Always return all mock quivers - filtering happens in applyFilters()
    return mockQuivers;
  }
</script>


<div class="w-full flex flex-col bg-base-200" style="height: calc(100vh - 100px); max-height: calc(100vh - 100px);">
  <!-- Search Bar -->
  <div class="flex-shrink-0 bg-base-300 border-b border-base-content/10 p-4 z-10">
    <div class="relative">
      <input
        type="text"
        placeholder="Search location (e.g., Rockaway Beach, Montauk)..."
        class="input input-bordered w-full"
        value={searchQuery}
        on:input={onSearchInput}
        aria-label="Search location"
      />
      {#if searchSuggestions.length > 0}
        <ul class="menu bg-base-100 rounded-box shadow-lg mt-2 w-full border border-base-300 absolute z-20 max-h-60 overflow-y-auto">
          {#each searchSuggestions as suggestion}
            <li>
              <button
                type="button"
                class="justify-start"
                on:click={() => selectPlace(suggestion)}
              >
                {suggestion.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <!-- Main Content: Cards + Map -->
  <div class="flex-1 flex flex-row overflow-hidden" style="min-height: 0; height: 100%;">
    <!-- Left Panel: Quiver Cards Grid -->
    <div class="flex-1 flex flex-col overflow-hidden" style="min-height: 0; width: calc(100% - 575px);">
      <div class="flex-1 overflow-y-auto p-4">
      {#if loading}
        <div class="p-4 space-y-4">
          {#each Array(3) as _}
            <div class="skeleton h-32 w-full"></div>
          {/each}
        </div>
      {:else if error}
        <div class="p-4">
          <div class="alert alert-error">
            <span>{error}</span>
            <button class="btn btn-sm" on:click={fetchQuivers}>Retry</button>
          </div>
        </div>
      {:else if filteredQuivers.length === 0}
        <div class="text-center py-12">
          <p class="text-gray-500 mb-4">No quivers found in this area.</p>
        </div>
      {:else}
        <div class="grid grid-cols-3 gap-4">
          {#each filteredQuivers as quiver (quiver.id)}
            <a
              id="quiver-{quiver.id}"
              href="/profile/{quiver.username}"
              data-sveltekit-prefetch
              class="card bg-base-100 border border-base-300 shadow-lg hover:shadow-2xl hover:scale-105 hover:border-primary/50 transition-all duration-300 cursor-pointer transform block no-underline text-base-content {selectedQuiverId === quiver.id ? 'ring-2 ring-primary shadow-xl' : ''}"
              on:mouseenter={() => {
                hoveredQuiverId = quiver.id;
                updateMapPins();
              }}
              on:mouseleave={() => {
                hoveredQuiverId = null;
                updateMapPins();
              }}
            >
              <div class="card-body p-4">
                <div class="flex flex-col items-center text-center gap-3">
                  <div class="avatar">
                    <div class="w-20 h-20 rounded-full bg-base-300">
                      <img
                        src={quiver.avatar_url || '/default_profile_picture.jpg'}
                        alt={quiver.username}
                        loading="lazy"
                        on:error={(e) => (e.currentTarget.src = '/default_profile_picture.jpg')}
                      />
                    </div>
                  </div>
                  <div class="flex-1 w-full">
                    <h3 class="font-bold text-lg mb-2">
                      @{quiver.username}
                    </h3>
                    {#if quiver.homebreak}
                      <p class="text-sm text-base-content/70 mb-2">🏄 {quiver.homebreak}</p>
                    {/if}
                    {#if quiver.favorite_board}
                      <p class="text-sm text-base-content/60">⭐ {quiver.favorite_board}</p>
                    {/if}
                  </div>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
      </div>
    </div>

    <!-- Right Panel: Map -->
    <div id="map-panel" class="flex border-l-2 border-primary/30 bg-base-300 flex-shrink-0" style="width: 575px; height: 100%;">
      <div id="map-container" class="w-full h-full"></div>
    </div>
  </div>
</div>

<style>
  :global(.quiver-pin) {
    cursor: pointer;
    transition: transform 0.2s;
  }
  :global(.quiver-pin:hover) {
    transform: scale(1.1);
  }
</style>

