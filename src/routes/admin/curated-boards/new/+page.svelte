<script lang="ts">
  import { enhance } from '$app/forms';

  export let form;

  let submitting = false;
  let message = "";

  // Form data
  let name = "";
  let make = "";
  let length = "";
  let width = "";
  let thickness = "";
  let volume = "";
  let fin_system = "";
  let fin_setup = "";
  let style = "";
  let price = "";
  let condition = "";
  let city = "";
  let region = "";
  let source_type = "";
  let source_url = "";
  let notes = "";
  let lat = "";
  let lon = "";

  // Location fields
  let locationQuery = "";
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let selectedLocation: { label: string; lat: number; lon: number; city: string; region: string } | null = null;
  let locationDebounceHandle: any;

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
    
    if (!v || v.trim() === "") {
      clearLocation();
      return;
    }
    
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
    city = s.city;
    region = s.region;
    lat = s.lat.toString();
    lon = s.lon.toString();
  }

  function clearLocation() {
    locationQuery = "";
    selectedLocation = null;
    city = "";
    region = "";
    lat = "";
    lon = "";
  }

  // Handle form errors
  $: if (form?.message) {
    message = form.message;
  }
</script>

<main class="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
  <div class="w-full max-w-xl bg-surface-elevated border border-border rounded-2xl shadow-sm p-6 sm:p-8 text-foreground">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-center text-foreground mb-6">
      Add Curated Board
    </h1>

    <form method="POST" class="space-y-4" use:enhance={() => {
      submitting = true;
      message = "";
      return async ({ update }) => {
        submitting = false;
        await update();
      };
    }}>
      <!-- Board Name (required) -->
      <div class="space-y-1">
        <label for="name" class="block text-sm font-medium text-muted-foreground">
          Board Name <span class="text-red-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          bind:value={name}
          placeholder="e.g. Star Cruiser"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Make (required) -->
      <div class="space-y-1">
        <label for="make" class="block text-sm font-medium text-muted-foreground">
          Make / Brand <span class="text-red-400">*</span>
        </label>
        <input
          id="make"
          name="make"
          type="text"
          bind:value={make}
          placeholder="e.g. Album, Firewire, JS"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Length (required) -->
      <div class="space-y-1">
        <label for="length" class="block text-sm font-medium text-muted-foreground">
          Length <span class="text-red-400">*</span>
        </label>
        <select
          id="length"
          name="length"
          bind:value={length}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select length</option>
          {#each Array(79) as _, i}
            {@const inches = i + 54}
            <option value={inches}
              >{Math.floor(inches / 12)}'{inches % 12}"</option
            >
          {/each}
        </select>
      </div>

      <!-- Width (optional) -->
      <div class="space-y-1">
        <label for="width" class="block text-sm font-medium text-muted-foreground">
          Width (in)
        </label>
        <input
          id="width"
          name="width"
          type="number"
          step="0.25"
          min="18"
          max="24"
          bind:value={width}
          placeholder="e.g. 21"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Thickness (optional) -->
      <div class="space-y-1">
        <label for="thickness" class="block text-sm font-medium text-muted-foreground">
          Thickness (in)
        </label>
        <input
          id="thickness"
          name="thickness"
          type="number"
          step="0.01"
          min="2"
          max="4.5"
          bind:value={thickness}
          placeholder="e.g. 2.75"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Volume (optional) -->
      <div class="space-y-1">
        <label for="volume" class="block text-sm font-medium text-muted-foreground">
          Volume (L)
        </label>
        <input
          id="volume"
          name="volume"
          type="number"
          step="0.5"
          min="20"
          max="100"
          bind:value={volume}
          placeholder="e.g. 40"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        />
      </div>

      <!-- Fin System (optional) -->
      <div class="space-y-1">
        <label for="fin_system" class="block text-sm font-medium text-muted-foreground">
          Fin System
        </label>
        <select
          id="fin_system"
          name="fin_system"
          bind:value={fin_system}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin system (optional)</option>
          <option>FCS II</option>
          <option>Futures</option>
          <option>Glass On</option>
          <option>FCS</option>
        </select>
      </div>

      <!-- Fin Setup (optional) -->
      <div class="space-y-1">
        <label for="fin_setup" class="block text-sm font-medium text-muted-foreground">
          Fin Setup
        </label>
        <select
          id="fin_setup"
          name="fin_setup"
          bind:value={fin_setup}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
        >
          <option value="">Select fin setup (optional)</option>
          <option>2+1</option>
          <option>Twin</option>
          <option>4+1</option>
          <option>Quad</option>
          <option>Single</option>
          <option>Tri</option>
          <option>Tri/Quad</option>
        </select>
      </div>

      <!-- Style (required) -->
      <div class="space-y-1">
        <label for="style" class="block text-sm font-medium text-muted-foreground">
          Board Style <span class="text-red-400">*</span>
        </label>
        <select
          id="style"
          name="style"
          bind:value={style}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select style</option>
          <option>Shortboard</option>
          <option>Mid-length</option>
          <option>Longboard</option>
          <option>Groveler</option>
          <option>Gun</option>
        </select>
      </div>

      <!-- Price (required) -->
      <div class="space-y-1">
        <label for="price" class="block text-sm font-medium text-muted-foreground">
          Price ($) <span class="text-red-400">*</span>
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          bind:value={price}
          placeholder="e.g. 850.00"
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Condition (required) -->
      <div class="space-y-1">
        <label for="condition" class="block text-sm font-medium text-muted-foreground">
          Condition <span class="text-red-400">*</span>
        </label>
        <select
          id="condition"
          name="condition"
          bind:value={condition}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select condition</option>
          <option>New</option>
          <option>Lightly Used</option>
          <option>Used</option>
          <option>Well-loved</option>
          <option>Needs Repair</option>
        </select>
      </div>

      <!-- Source Type (required) -->
      <div class="space-y-1">
        <label for="source_type" class="block text-sm font-medium text-muted-foreground">
          Source Type <span class="text-red-400">*</span>
        </label>
        <select
          id="source_type"
          name="source_type"
          bind:value={source_type}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        >
          <option disabled selected value="">Select source type</option>
          <option>craigslist</option>
          <option>facebook</option>
          <option>shop</option>
          <option>other</option>
        </select>
      </div>

      <!-- Source URL (required) -->
      <div class="space-y-1">
        <label for="source_url" class="block text-sm font-medium text-muted-foreground">
          Source URL <span class="text-red-400">*</span>
        </label>
        <input
          id="source_url"
          name="source_url"
          type="url"
          bind:value={source_url}
          placeholder="https://..."
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          required
        />
      </div>

      <!-- Location (required) -->
      <div class="space-y-1">
        <label for="location" class="block text-sm font-medium text-muted-foreground">
          Location <span class="text-red-400">*</span>
        </label>
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
            required
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
            <p class="text-xs text-muted-foreground">
              Selected: {selectedLocation.label}
            </p>
            <button
              type="button"
              class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              on:click={clearLocation}
            >
              Clear
            </button>
          </div>
        {/if}
        <!-- Hidden inputs for city, region, lat, lon -->
        <input type="hidden" name="city" bind:value={city} />
        <input type="hidden" name="region" bind:value={region} />
        <input type="hidden" name="lat" bind:value={lat} />
        <input type="hidden" name="lon" bind:value={lon} />
      </div>

      <!-- Notes (optional) -->
      <div class="space-y-1">
        <label for="notes" class="block text-sm font-medium text-muted-foreground">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          bind:value={notes}
          class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
          placeholder="Anything special about this board?"
        ></textarea>
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="w-full mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed"
        disabled={submitting}
      >
        {submitting ? "Creating..." : "Create Curated Board"}
      </button>

      {#if message}
        <div class="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-foreground">
          <span class={message.includes('Failed') ? 'text-red-400' : 'text-green-400'}>{message}</span>
        </div>
      {/if}
    </form>
  </div>
</main>

