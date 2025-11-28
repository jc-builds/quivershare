<script lang="ts">
  import './styles.css';

  // Location autocomplete state
  let locationQuery = '';
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let locationDebounceHandle: any;
  let selectedLocation: { label: string; lat: number; lon: number; city: string; region: string } | null = null;
  let searchRadius = 15; // Default 15 miles

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

<main>
  <!-- Hero Section -->
  <section class="w-full min-h-[80vh] flex items-center bg-gradient-to-b from-background via-background to-surface/40 py-20 md:py-28" aria-labelledby="hero-title">
    <div class="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 w-full">
      <div class="flex flex-col items-center text-center space-y-8 md:space-y-10">
        <div class="space-y-6 md:space-y-8">
          <h1 id="hero-title" class="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-foreground">
            Surfboards.<br />
            Nothing but surfboards.
          </h1>
          <p class="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            The marketplace designed just for surfboards. Find boards near you, list your own, and use built-in advertising tools for shops and shapers.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 md:gap-4 pt-2">
          <a href="/s" class="inline-flex items-center justify-center rounded-lg border border-border bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-alt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background" data-sveltekit-prefetch>
            Browse boards near you
          </a>
          <a href="/create-surfboard" class="inline-flex items-center justify-center rounded-lg border border-border bg-surface/50 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:border-border focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background" data-sveltekit-prefetch>
            List a board
          </a>
        </div>
        <div class="flex flex-col items-center text-center mt-4">
          <p class="text-xs sm:text-sm text-muted-foreground mt-2">
            Right now we're focused on New York, New Jersey, and the East Coast while we grow. We'll focus on other regions soon.
          </p>
          <p class="text-xs sm:text-sm text-muted-foreground">
            Early adopters get <span class="font-semibold text-primary">one free 14-day Boost per board listed</span>, paid ads for your listing on Instagram and Facebook.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Social Proof / Logo Strip -->
  <section class="w-full py-16 md:py-20 bg-surface/30 border-y border-border">
    <div class="mx-auto max-w-5xl px-4 md:px-6 lg:px-8 w-full">
      <div class="logo-marquee-wrapper relative w-full overflow-hidden">
        <!-- Gradient masks -->
        <div class="logo-marquee-gradient logo-marquee-gradient-left absolute top-0 bottom-0 w-32 z-10 pointer-events-none left-0 bg-gradient-to-r from-surface/30 to-transparent"></div>
        <div class="logo-marquee-gradient logo-marquee-gradient-right absolute top-0 bottom-0 w-32 z-10 pointer-events-none right-0 bg-gradient-to-l from-surface/30 to-transparent"></div>
        
        <!-- Marquee container -->
        <div class="logo-marquee-inner flex flex-nowrap w-fit will-change-transform">
          <!-- First strip -->
          <div class="logo-marquee-strip flex flex-nowrap w-fit gap-6 lg:gap-10 flex-shrink-0">
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Montauk Surf Co.</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Rockaway Board Shop</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">OBX Foam & Fiberglass</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Pacific Glide</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">East Coast Shapers</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Left Point Surf Supply</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Long Beach Boardroom</span>
          </div>
          <!-- Duplicate strip for seamless loop -->
          <div class="logo-marquee-strip flex flex-nowrap w-fit gap-6 lg:gap-10 flex-shrink-0" aria-hidden="true">
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Montauk Surf Co.</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Rockaway Board Shop</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">OBX Foam & Fiberglass</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Pacific Glide</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">East Coast Shapers</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Left Point Surf Supply</span>
            <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Long Beach Boardroom</span>
          </div>
        </div>
      </div>
      <p class="text-center text-xs md:text-sm text-muted-foreground/80 mt-10 mb-0 font-medium tracking-wide uppercase">Trusted by local surfers & shops</p>
    </div>
  </section>

  <!-- Search Section -->
  <section class="border-t border-border bg-background py-16 md:py-20" aria-labelledby="search-title">
    <div class="mx-auto max-w-2xl px-4 md:px-6 lg:px-8">
      <div class="mb-10 text-center">
        <h2
          id="search-title"
          class="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3"
        >
          Search boards near you
        </h2>
        <p class="text-base md:text-lg text-muted-foreground">
          Enter your location and radius to find surfboard listings.
        </p>
      </div>
      <div class="rounded-xl border border-border bg-surface-elevated/50 p-6 md:p-8 shadow-sm">
        <form method="get" action="/s" aria-label="Search surfboards by location" class="flex flex-col gap-5">
          <div>
            <label
              for="search-location"
              class="block text-sm font-medium text-foreground mb-2"
            >
              Location
            </label>
            <div class="relative">
              <input
                id="search-location"
                name="q"
                type="text"
                placeholder="Enter city, state, or zip code…"
                class="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                value={locationQuery}
                on:input={onLocationInput}
                autocomplete="off"
                aria-autocomplete="list"
                aria-controls="location-suggestions-list"
              />
              {#if locationSuggestions.length > 0}
                <ul
                  id="location-suggestions-list"
                  class="absolute left-0 right-0 z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-lg backdrop-blur-sm"
                >
                  {#each locationSuggestions as s}
                    <li>
                      <button
                        type="button"
                        class="flex w-full items-center px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                        on:click={() => chooseLocationSuggestion(s)}
                      >
                        {s.label}
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>

          <div>
            <label
              for="search-radius"
              class="block text-sm font-medium text-foreground mb-2"
            >
              Within
            </label>
            <div class="flex items-center gap-3">
              <input
                id="search-radius"
                name="distance"
                type="number"
                min="1"
                max="500"
                bind:value={searchRadius}
                class="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
              <span class="whitespace-nowrap text-sm text-muted-foreground">
                miles
              </span>
            </div>
          </div>

          <button
            type="submit"
            class="inline-flex w-full items-center justify-center rounded-lg border border-border bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary-alt focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-elevated md:w-auto"
          >
            Search Boards
          </button>
        </form>
      </div>
    </div>
  </section>

  <!-- How it works Section -->
  <section
    class="border-t border-border bg-background py-16 md:py-20"
    aria-labelledby="how-it-works-title"
  >
    <div class="mx-auto max-w-4xl px-4 md:px-6 lg:px-8">
      <div class="mb-10 text-center">
        <h2
          id="how-it-works-title"
          class="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3"
        >
          How QuiverShare works
        </h2>
        <p class="text-base md:text-lg text-muted-foreground">
          A simple flow for both surfers and sellers / shops.
        </p>
      </div>

      <div class="grid gap-6 md:grid-cols-3 md:gap-8">
        <!-- Step 1 -->
        <div class="rounded-xl border border-border bg-surface-elevated/50 p-6 md:p-7 shadow-sm">
          <p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
            Step 1
          </p>
          <h3 class="mb-2 text-base font-semibold text-foreground">
            Browse boards near you
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Enter your location, pick a radius, and see used boards nearby. Filter by size, style, or price when you're ready.
          </p>
        </div>

        <!-- Step 2 -->
        <div class="rounded-xl border border-border bg-surface-elevated/50 p-6 md:p-7 shadow-sm">
          <p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
            Step 2
          </p>
          <h3 class="mb-2 text-base font-semibold text-foreground">
            List your board in minutes
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Add photos, dims, fin setup, and price. Your listing is built around the details surfers actually care about.
          </p>
        </div>

        <!-- Step 3 -->
        <div class="rounded-xl border border-border bg-surface-elevated/50 p-6 md:p-7 shadow-sm">
          <p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
            Step 3
          </p>
          <h3 class="mb-2 text-base font-semibold text-foreground">
            Boost to reach more surfers
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Run ads for your board on Instagram and Facebook using Meta's audience data, so the right people see it.
          </p>
        </div>
      </div>

      <p class="mt-8 text-center text-sm text-muted-foreground">
        Boosts are currently offered as <span class="font-semibold text-primary">free credits to early sellers</span>, to help get your board seen!
      </p>
    </div>
  </section>

  <!-- Feature Cards Section -->
  <section
    class="border-t border-border bg-background py-16 md:py-20"
    aria-labelledby="features-title"
  >
    <div class="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
      <div class="mb-12 md:mb-16 text-center max-w-2xl mx-auto">
        <h2
          id="features-title"
          class="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3"
        >
          Why surfers use QuiverShare
        </h2>
        <p class="text-base md:text-lg text-muted-foreground">
          It's a marketplace built around how surfers actually buy and sell boards.
        </p>
      </div>
      <div class="grid gap-6 md:grid-cols-3 md:gap-8">
        <div class="feature-card rounded-xl border border-border bg-surface-elevated/50 p-6 md:p-8 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <div class="mb-5 h-1 w-12 rounded-full bg-primary/60"></div>
          <h3 class="mb-3 text-lg font-semibold text-foreground">
            Built for Surfboards
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            QuiverShare focuses only on surfboards, no furniture, no random classifieds. Search by length, volume, fin setup, and more.
          </p>
        </div>
        <div class="feature-card rounded-xl border border-border bg-surface-elevated/50 p-6 md:p-8 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <div class="mb-5 h-1 w-12 rounded-full bg-primary/60"></div>
          <h3 class="mb-3 text-lg font-semibold text-foreground">
            Local First, Travel Friendly
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Find boards near you for easy meetups, or hunt for the perfect board at your next surf destination.
          </p>
        </div>
        <div class="feature-card rounded-xl border border-border bg-surface-elevated/50 p-6 md:p-8 shadow-sm transition-all hover:shadow-md hover:border-border/80">
          <div class="mb-5 h-1 w-12 rounded-full bg-primary/60"></div>
          <h3 class="mb-3 text-lg font-semibold text-foreground">
            Promotion for Surfers & Shops
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Boost your listings with built-in advertising tools. Perfect for local surf shops, shapers, and regular surfers who want their board seen.
          </p>
        </div>
      </div>
    </div>
  </section>
</main>
