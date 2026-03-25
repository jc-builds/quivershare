<script lang="ts">
  import './styles.css';
  import LocationAutocomplete from '$lib/components/LocationAutocomplete.svelte';
  import type { StructuredLocation } from '$lib/types/location';
  import { goto } from '$app/navigation';

  let selectedLocation: StructuredLocation | null = null;
  let searchRadius = 15;
  let searchError = '';

  function handleSearchSubmit(e: Event) {
    e.preventDefault();
    if (!selectedLocation) {
      searchError = 'Please select a location from the suggestions';
      return;
    }
    searchError = '';
    const params = new URLSearchParams();
    params.set('loc_label', selectedLocation.label);
    params.set('loc_lat', selectedLocation.lat.toString());
    params.set('loc_lon', selectedLocation.lon.toString());
    params.set('distance', searchRadius.toString());
    goto(`/s?${params.toString()}`);
  }
</script>

<svelte:head>
  <title>Used Surfboard Marketplace | QuiverShare</title>
  <meta
    name="description"
    content="Buy and sell used surfboards in New York, New Jersey, and the East Coast on QuiverShare, the surfboard marketplace built for surfers."
  />
  <link rel="canonical" href="https://www.quivershare.com/" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Used Surfboard Marketplace | QuiverShare" />
  <meta property="og:description" content="Buy and sell used surfboards in New York, New Jersey, and the East Coast on QuiverShare, the surfboard marketplace built for surfers." />
  <meta property="og:url" content="https://www.quivershare.com/" />
  <meta property="og:image" content="https://www.quivershare.com/FullLogo_Transparent_NoBuffer.png" />
  <meta property="og:site_name" content="QuiverShare" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="Used Surfboard Marketplace | QuiverShare" />
  <meta name="twitter:description" content="Buy and sell used surfboards in New York, New Jersey, and the East Coast on QuiverShare, the surfboard marketplace built for surfers." />
  <meta name="twitter:image" content="https://www.quivershare.com/FullLogo_Transparent_NoBuffer.png" />
</svelte:head>

<main>
  <!-- Hero Section -->
  <section class="w-full min-h-[80vh] flex items-center bg-gradient-to-b from-background via-background to-surface/40 py-20 md:py-28" aria-labelledby="hero-title">
    <div class="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 w-full">
      <div class="flex flex-col items-center text-center space-y-8 md:space-y-10">
        <div class="space-y-6 md:space-y-8">
          <h1 id="hero-title" class="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-foreground">
            Used Surfboard Marketplace<br />
            for New York &amp; New Jersey
          </h1>
          <p class="text-xl md:text-2xl font-semibold text-foreground/80">
            Surfboards. Nothing but surfboards.
          </p>
          <p class="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            Find boards near you, list your own, or manage inventory for your surf shop.
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
        </div>
      </div>
    </div>
  </section>

  <!-- <!-- Social Proof / Logo Strip -->
<!-- <section class="w-full py-16 md:py-20 bg-surface/30 border-y border-border"> -->
<!--   <div class="mx-auto max-w-5xl px-4 md:px-6 lg:px-8 w-full"> -->
<!--     <div class="logo-marquee-wrapper relative w-full overflow-hidden"> -->
<!--       <!-- Gradient masks --> 
<!--       <div class="logo-marquee-gradient logo-marquee-gradient-left absolute top-0 bottom-0 w-32 z-10 pointer-events-none left-0 bg-gradient-to-r from-surface/30 to-transparent"></div> -->
<!--       <div class="logo-marquee-gradient logo-marquee-gradient-right absolute top-0 bottom-0 w-32 z-10 pointer-events-none right-0 bg-gradient-to-l from-surface/30 to-transparent"></div> -->
<!--        -->
<!--       <!-- Marquee container --> 
<!--       <div class="logo-marquee-inner flex flex-nowrap w-fit will-change-transform"> -->
<!--         <!-- First strip --> 
<!--         <div class="logo-marquee-strip flex flex-nowrap w-fit gap-6 lg:gap-10 flex-shrink-0"> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Montauk Surf Co.</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Rockaway Board Shop</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">OBX Foam & Fiberglass</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Pacific Glide</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">East Coast Shapers</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Left Point Surf Supply</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Long Beach Boardroom</span> -->
<!--         </div> -->
<!--         <!-- Duplicate strip for seamless loop --> 
<!--         <div class="logo-marquee-strip flex flex-nowrap w-fit gap-6 lg:gap-10 flex-shrink-0" aria-hidden="true"> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Montauk Surf Co.</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Rockaway Board Shop</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">OBX Foam & Fiberglass</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Pacific Glide</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">East Coast Shapers</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Left Point Surf Supply</span> -->
<!--           <span class="logo-item h-11 lg:h-12 w-fit inline-flex items-center px-5 py-2.5 border border-border/50 rounded-lg text-sm text-muted-foreground font-medium whitespace-nowrap bg-surface-elevated/50 backdrop-blur-sm">Long Beach Boardroom</span> -->
<!--         </div> -->
<!--       </div> -->
<!--     </div> -->
<!--     <p class="text-center text-xs md:text-sm text-muted-foreground/80 mt-10 mb-0 font-medium tracking-wide uppercase">Trusted by local surfers & shops</p> -->
<!--   </div> -->
<!-- </section> -->


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
        <form on:submit|preventDefault={handleSearchSubmit} aria-label="Search surfboards by location" class="flex flex-col gap-5">
          <LocationAutocomplete
            bind:value={selectedLocation}
            required={false}
            label="Location"
            id="search-location"
            placeholder="Enter city, state, or zip code…"
            clearable={true}
          />

          {#if searchError}
            <p class="text-sm text-red-400">{searchError}</p>
          {/if}

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
            Connect with buyers
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Interested surfers reach out through the listing. Arrange a meetup and get your board into the right hands.
          </p>
        </div>
      </div>
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
            Built for Shops &amp; Shapers
          </h3>
          <p class="text-sm leading-relaxed text-muted-foreground">
            Surf shops and shapers can create a shop, manage inventory, and reach local surfers directly through the marketplace.
          </p>
        </div>
      </div>
    </div>
  </section>
</main>
