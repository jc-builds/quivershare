<script lang="ts">
  import './styles.css';
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
        Search by model, make, or location.
      </p>

      <form method="get" action="/s" aria-label="Search surfboards">
        <div class="form-section space-y-4">
          <div class="form-control">
            <label for="search-query" class="label-text text-sm font-medium">
              Search
            </label>
            <input
              id="search-query"
              name="q"
              type="text"
              placeholder="Search by make, model, or location…"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-grid">
            <div class="form-control">
              <label for="search-style" class="label-text text-sm font-medium">
                Style
              </label>
              <select id="search-style" name="style" class="select select-bordered w-full">
                <option value="">All</option>
                <option value="Shortboard">Shortboard</option>
                <option value="Longboard">Longboard</option>
                <option value="Groveler">Groveler</option>
                <option value="Gun">Gun</option>
              </select>
            </div>

            <div class="form-control">
              <label for="search-distance" class="label-text text-sm font-medium">
                Distance
              </label>
              <select id="search-distance" name="distance" class="select select-bordered w-full">
                <option value="10">10 miles</option>
                <option value="25">25 miles</option>
                <option value="50">50 miles</option>
                <option value="100">100 miles</option>
                <option value="250">250 miles</option>
                <option value="" selected>All</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-full sm:w-auto">
          Search Boards
        </button>
      </form>

    </div>
  </section>
</main>
