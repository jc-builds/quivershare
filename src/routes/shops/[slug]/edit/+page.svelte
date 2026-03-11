<script lang="ts">
  import { enhance } from "$app/forms";

  export let data: {
    shop: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      website_url: string | null;
      email: string | null;
      phone: string | null;
      location_label: string | null;
      city: string | null;
      region: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
      logo_image_url: string | null;
      banner_image_url: string | null;
      owner_user_id: string;
      is_active: boolean;
    };
    notice: string | null;
  };

  export let form: {
    message?: string;
    values?: {
      name: string;
      description: string;
      website_url: string;
      email: string;
      phone: string;
      location_label: string;
    };
  } | null;

  const shop = data.shop;

  let name = form?.values?.name ?? shop.name ?? '';
  let description = form?.values?.description ?? shop.description ?? '';
  let website_url = form?.values?.website_url ?? shop.website_url ?? '';
  let email = form?.values?.email ?? shop.email ?? '';
  let phone = form?.values?.phone ?? shop.phone ?? '';
  let submitting = false;
  let message = '';

  $: if (form?.message) {
    message = form.message;
  }

  // Notice from redirect (e.g. already_has_shop)
  $: if (data.notice === 'already_has_shop' && !message) {
    message = 'You already have a shop! If you own multiple shops, reach out to info@quivershare.com.';
  }

  // Location state
  let locationQuery = form?.values?.location_label ?? shop.location_label ?? '';
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let selectedLocation: { label: string; lat: number; lon: number; city: string; region: string; country: string } | null = null;
  let locationDebounceHandle: ReturnType<typeof setTimeout>;

  let loc_city = shop.city ?? '';
  let loc_region = shop.region ?? '';
  let loc_country = shop.country ?? '';
  let loc_lat = shop.latitude?.toString() ?? '';
  let loc_lon = shop.longitude?.toString() ?? '';

  // Initialize selected location from existing data
  if (shop.latitude && shop.longitude) {
    selectedLocation = {
      label: locationQuery || 'Selected location',
      lat: shop.latitude,
      lon: shop.longitude,
      city: shop.city ?? '',
      region: shop.region ?? '',
      country: shop.country ?? ''
    };
  }

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
    if (!v || v.trim() === '') {
      clearLocation();
      return;
    }
    selectedLocation = null;
    clearTimeout(locationDebounceHandle);
    locationDebounceHandle = setTimeout(() => searchLocationPlaces(locationQuery), 200);
  }

  function chooseLocationSuggestion(s: (typeof locationSuggestions)[number]) {
    locationQuery = s.label;
    selectedLocation = { label: s.label, lat: s.lat, lon: s.lon, city: s.city, region: s.region, country: s.country };
    locationSuggestions = [];
    loc_city = s.city;
    loc_region = s.region;
    loc_country = s.country;
    loc_lat = s.lat.toString();
    loc_lon = s.lon.toString();
  }

  function clearLocation() {
    locationQuery = '';
    selectedLocation = null;
    loc_city = '';
    loc_region = '';
    loc_country = '';
    loc_lat = '';
    loc_lon = '';
  }

  // Image previews
  let logoPreview: string | null = null;
  let bannerPreview: string | null = null;

  function onLogoChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    logoPreview = file ? URL.createObjectURL(file) : null;
  }

  function onBannerChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    bannerPreview = file ? URL.createObjectURL(file) : null;
  }
</script>

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-1">
      Edit Shop
    </h1>
    <p class="text-sm text-muted-foreground mb-6">
      Slug: <span class="font-mono text-foreground">{shop.slug}</span>
    </p>

    {#if message}
      <div class="mb-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
        <span class={message.startsWith('You already') ? 'text-primary' : 'text-red-400'}>{message}</span>
      </div>
    {/if}

    <form method="POST" enctype="multipart/form-data" class="space-y-4" use:enhance={() => {
      submitting = true;
      message = '';
      return async ({ update }) => {
        submitting = false;
        await update();
      };
    }}>
      <!-- Name -->
      <div class="space-y-1">
        <label for="name" class="block text-sm font-medium text-muted-foreground">Shop Name</label>
        <input
          id="name"
          name="name"
          type="text"
          bind:value={name}
          placeholder="e.g. Westside Surf Co."
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Description -->
      <div class="space-y-1">
        <label for="description" class="block text-sm font-medium text-muted-foreground">Description (optional)</label>
        <textarea
          id="description"
          name="description"
          bind:value={description}
          placeholder="Tell surfers about your shop..."
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        ></textarea>
      </div>

      <!-- Website URL -->
      <div class="space-y-1">
        <label for="website_url" class="block text-sm font-medium text-muted-foreground">Website URL</label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          bind:value={website_url}
          placeholder="https://www.yourshop.com"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Email -->
      <div class="space-y-1">
        <label for="email" class="block text-sm font-medium text-muted-foreground">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          bind:value={email}
          placeholder="contact@yourshop.com"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Phone -->
      <div class="space-y-1">
        <label for="phone" class="block text-sm font-medium text-muted-foreground">Phone (optional)</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          bind:value={phone}
          placeholder="(555) 123-4567"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Location -->
      <div class="space-y-1">
        <label for="location" class="block text-sm font-medium text-muted-foreground">Location (optional)</label>
        <div class="relative">
          <input
            id="location"
            type="text"
            class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
            placeholder="Start typing... e.g. San Diego, CA"
            value={locationQuery}
            on:input={onLocationInput}
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="location-suggestions-list"
          />
          {#if locationSuggestions.length > 0}
            <ul id="location-suggestions-list" class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-surface-elevated border border-border rounded-lg shadow-lg text-sm">
              {#each locationSuggestions as s}
                <li>
                  <button type="button" class="w-full text-left px-3 py-2 hover:bg-surface transition-colors text-foreground" on:click={() => chooseLocationSuggestion(s)}>
                    {s.label}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
        {#if selectedLocation}
          <div class="flex items-center justify-between mt-1">
            <p class="text-xs text-muted-foreground">Selected: {selectedLocation.label}</p>
            <button type="button" class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" on:click={clearLocation}>
              Clear
            </button>
          </div>
        {/if}
        <input type="hidden" name="location_label" value={locationQuery} />
        <input type="hidden" name="city" value={loc_city} />
        <input type="hidden" name="region" value={loc_region} />
        <input type="hidden" name="country" value={loc_country} />
        <input type="hidden" name="lat" value={loc_lat} />
        <input type="hidden" name="lon" value={loc_lon} />
      </div>

      <!-- Logo -->
      <div class="space-y-1">
        <label for="logo" class="block text-sm font-medium text-muted-foreground">Logo (optional — upload to replace)</label>
        {#if shop.logo_image_url && !logoPreview}
          <img src={shop.logo_image_url} alt="Current logo" class="h-20 w-20 rounded-lg object-cover border border-border mb-2" />
        {/if}
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          on:change={onLogoChange}
          class="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-elevated file:transition file:cursor-pointer"
        />
        {#if logoPreview}
          <img src={logoPreview} alt="Logo preview" class="mt-2 h-20 w-20 rounded-lg object-cover border border-border" />
        {/if}
      </div>

      <!-- Banner -->
      <div class="space-y-1">
        <label for="banner" class="block text-sm font-medium text-muted-foreground">Banner (optional — upload to replace)</label>
        {#if shop.banner_image_url && !bannerPreview}
          <img src={shop.banner_image_url} alt="Current banner" class="w-full h-32 rounded-lg object-cover border border-border mb-2" />
        {/if}
        <input
          id="banner"
          name="banner"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          on:change={onBannerChange}
          class="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-elevated file:transition file:cursor-pointer"
        />
        {#if bannerPreview}
          <img src={bannerPreview} alt="Banner preview" class="mt-2 w-full h-32 rounded-lg object-cover border border-border" />
        {/if}
      </div>

      <!-- Submit -->
      <button
        type="submit"
        class="w-full mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting}
      >
        {submitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  </div>
</main>
