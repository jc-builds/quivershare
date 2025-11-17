<script lang="ts">
  import './styles.css';

  // Location autocomplete state
  let locationQuery = '';
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let locationDebounceHandle: any;
  let selectedLocation: { label: string; lat: number; lon: number; city: string; region: string } | null = null;
  let searchRadius = 50; // Default 50 miles

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
  <title>QuiverShare | Find used surfboards near you</title>
  <meta
    name="description"
    content="Discover and list used surfboards in your area. Search QuiverShare by make, model, or location."
  />
</svelte:head>

<main class="home-wrapper">
  <section class="home-hero" aria-labelledby="homepage-title">
    <video
      class="hero-video"
      autoplay
      loop
      muted
      playsinline
      aria-hidden="true"
    >
      <source src="/home_background.mp4" type="video/mp4" />
    </video>
    <div class="hero-overlay-card">
      <h1 id="homepage-title" class="text-3xl sm:text-4xl font-bold mb-3">
        Find used surfboards near you
      </h1>
      <p class="mb-6 max-w-xl leading-relaxed">
        Search for surfboards by location.
      </p>

      <form method="get" action="/s" aria-label="Search surfboards by location">
        <div class="form-control">
          <label for="search-location" class="label-text text-sm font-medium">
            Location
          </label>
          <div class="relative">
            <input
              id="search-location"
              name="q"
              type="text"
              placeholder="Enter city, state, or zip code…"
              class="input input-bordered w-full"
              value={locationQuery}
              on:input={onLocationInput}
              autocomplete="off"
              aria-autocomplete="list"
              aria-controls="location-suggestions-list"
            />
            {#if locationSuggestions.length > 0}
              <ul id="location-suggestions-list" class="menu bg-base-100 rounded-box shadow-lg mt-1 w-full absolute z-10 max-h-60 overflow-y-auto">
                {#each locationSuggestions as s}
                  <li>
                    <button type="button" class="justify-start" on:click={() => chooseLocationSuggestion(s)}>
                      {s.label}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </div>

        <div class="form-control">
          <label for="search-radius" class="label-text text-sm font-medium">
            Within
          </label>
          <div class="flex items-center gap-2">
            <input
              id="search-radius"
              name="distance"
              type="number"
              min="1"
              max="500"
              bind:value={searchRadius}
              class="input input-bordered w-full"
            />
            <span class="text-sm text-base-content/70 whitespace-nowrap">miles</span>
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-full sm:w-auto mt-4">
          Search Boards
        </button>
      </form>

    </div>
  </section>
</main>
