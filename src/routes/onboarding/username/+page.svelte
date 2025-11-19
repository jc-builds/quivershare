<script lang="ts">
  import { page } from '$app/stores';

  export let form:
    | {
        message?: string;
        fieldErrors?: Record<string, string>;
        values?: { 
          username?: string; 
          full_name?: string;
          home_break_label?: string;
          magic_board?: string;
          redirectTo?: string;
        };
      }
    | undefined;

  let username = form?.values?.username ?? '';
  let fullName = form?.values?.full_name ?? '';
  let homeBreakLabel = form?.values?.home_break_label ?? '';
  let magicBoard = form?.values?.magic_board ?? '';
  let redirectTo =
    form?.values?.redirectTo ??
    (new URLSearchParams($page.url.search).get('redirectTo') ?? '/');

  const usernamePattern = '^[a-z0-9_]{3,20}$';

  // --- Location autocomplete state ---
  let locationQuery = '';
  let locationSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let pickingLocation = false;

  // Hidden fields to submit for location
  let loc_id = '';
  let loc_label = '';
  let loc_lat: number | '' = '';
  let loc_lon: number | '' = '';
  let loc_city = '';
  let loc_region = '';
  let loc_country = '';

  // --- Home break autocomplete state ---
  let homeBreakQuery = '';
  let homeBreakSuggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let pickingHomeBreak = false;

  // Hidden fields to submit for home break
  let hb_id = '';
  let hb_label = '';
  let hb_lat: number | '' = '';
  let hb_lon: number | '' = '';
  let hb_city = '';
  let hb_region = '';
  let hb_country = '';

  // Profile picture upload
  let profilePictureFile: File | null = null;
  let profilePicturePreview: string | null = '/default_profile_picture.jpg';

  let debounceHandle: any;
  let homeBreakDebounceHandle: any;

  async function searchPlaces(q: string) {
    if (!q || q.length < 2) {
      locationSuggestions = [];
      return;
    }
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    locationSuggestions = data.features ?? [];
  }

  async function searchHomeBreakPlaces(q: string) {
    if (!q || q.length < 2) {
      homeBreakSuggestions = [];
      return;
    }
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    homeBreakSuggestions = data.features ?? [];
  }

  function onLocationInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    locationQuery = v;
    // clear selection if user edits text again
    loc_id = ''; loc_label = ''; loc_lat = ''; loc_lon = ''; loc_city = ''; loc_region = ''; loc_country = '';

    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => searchPlaces(locationQuery), 200);
  }

  function chooseLocationSuggestion(s: (typeof locationSuggestions)[number]) {
    pickingLocation = true;
    locationQuery = s.label;
    loc_id = s.id;
    loc_label = s.label;
    loc_lat = s.lat;
    loc_lon = s.lon;
    loc_city = s.city;
    loc_region = s.region;
    loc_country = s.country;
    locationSuggestions = [];
    pickingLocation = false;
  }

  function onHomeBreakInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    homeBreakQuery = v;
    homeBreakLabel = v;
    // clear selection if user edits text again
    hb_id = ''; hb_label = ''; hb_lat = ''; hb_lon = ''; hb_city = ''; hb_region = ''; hb_country = '';

    clearTimeout(homeBreakDebounceHandle);
    homeBreakDebounceHandle = setTimeout(() => searchHomeBreakPlaces(homeBreakQuery), 200);
  }

  function chooseHomeBreakSuggestion(s: (typeof homeBreakSuggestions)[number]) {
    pickingHomeBreak = true;
    homeBreakQuery = s.label;
    homeBreakLabel = s.label;
    hb_id = s.id;
    hb_label = s.label;
    hb_lat = s.lat;
    hb_lon = s.lon;
    hb_city = s.city;
    hb_region = s.region;
    hb_country = s.country;
    homeBreakSuggestions = [];
    pickingHomeBreak = false;
  }

  function handleProfilePictureSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    const type = file.type.toLowerCase();
    if (type !== 'image/jpeg' && type !== 'image/jpg' && type !== 'image/png' && type !== 'image/webp') {
      alert('Only JPEG, PNG, and WebP images are supported.');
      return;
    }

    profilePictureFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      profilePicturePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function removeProfilePicture() {
    profilePictureFile = null;
    profilePicturePreview = '/default_profile_picture.jpg';
  }
</script>

<section class="max-w-md mx-auto px-4 py-8 sm:px-6 bg-background text-foreground">
  <h1 class="text-2xl font-semibold tracking-tight mb-2 text-foreground">Finish setup</h1>
  <p class="text-sm text-muted-foreground mb-6">
    Set up your QuiverShare profile so other surfers know who you are.
  </p>

  <form method="POST" enctype="multipart/form-data" class="space-y-5 bg-surface-elevated/90 border border-border rounded-xl px-5 py-6 shadow-sm">
    <input type="hidden" name="redirectTo" value={redirectTo} />

    <!-- Username (required) -->
    <div class="space-y-1.5">
      <label for="username" class="block text-xs font-medium text-muted-foreground">
        Username <span class="text-red-400">*</span>
      </label>
      <input
        id="username"
        name="username"
        bind:value={username}
        placeholder="3–20 chars: a–z 0–9 _"
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        minlength="3"
        maxlength="20"
        pattern={usernamePattern}
        autocomplete="username"
        required
        autofocus
        aria-invalid={!!form?.fieldErrors?.username}
        aria-errormessage="username-error"
      />
      {#if form?.fieldErrors?.username}
        <p id="username-error" class="mt-1 text-xs text-red-400">{form.fieldErrors.username}</p>
      {/if}
    </div>

    <!-- Full Name (optional) -->
    <div class="space-y-1.5">
      <label for="full_name" class="block text-xs font-medium text-muted-foreground">
        Full Name (optional)
      </label>
      <input
        id="full_name"
        name="full_name"
        bind:value={fullName}
        placeholder="Your full name"
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        maxlength="100"
        autocomplete="name"
        aria-invalid={!!form?.fieldErrors?.full_name}
        aria-errormessage="full_name-error"
      />
      {#if form?.fieldErrors?.full_name}
        <p id="full_name-error" class="mt-1 text-xs text-red-400">{form.fieldErrors.full_name}</p>
      {/if}
    </div>

    <!-- Profile Picture (optional) -->
    <div class="space-y-2">
      <span class="block text-xs font-medium text-muted-foreground">
        Profile Picture (optional)
      </span>
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 rounded-full bg-surface border border-border overflow-hidden flex items-center justify-center">
          <img
            src={profilePicturePreview || '/default_profile_picture.jpg'}
            alt="Profile preview"
            class="w-full h-full object-cover"
            on:error={(e) => ((e.currentTarget as HTMLImageElement).src = '/default_profile_picture.jpg')}
          />
        </div>
        <div class="flex-1">
          <input
            type="file"
            name="profile_picture"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            on:change={handleProfilePictureSelect}
            class="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-surface file:text-foreground file:text-xs file:font-medium hover:file:bg-surface-elevated cursor-pointer"
          />
          {#if profilePicturePreview && profilePicturePreview !== '/default_profile_picture.jpg'}
            <button
              type="button"
              class="mt-2 inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
              on:click={removeProfilePicture}
            >
              Remove
            </button>
          {/if}
        </div>
      </div>
      {#if form?.fieldErrors?.profile_picture}
        <p class="mt-1 text-xs text-red-400">{form.fieldErrors.profile_picture}</p>
      {/if}
    </div>

    <!-- Location (optional) -->
    <div class="space-y-1.5">
      <label for="location" class="block text-xs font-medium text-muted-foreground">
        Location (optional)
      </label>
      <div class="relative">
        <input
          id="location"
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          name="locationQuery"
          placeholder="Start typing... e.g. Brooklyn"
          value={locationQuery}
          on:input={onLocationInput}
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded={locationSuggestions.length > 0}
          aria-controls="location-suggestions"
        />

        {#if locationSuggestions.length > 0}
          <ul id="location-suggestions" class="mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-md text-sm z-20 absolute">
            {#each locationSuggestions as s}
              <li>
                <button type="button" class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface/80 transition-colors" on:click={() => chooseLocationSuggestion(s)}>
                  {s.label}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- Hidden fields sent to server on submit -->
      <input type="hidden" name="place_id" value={loc_id} />
      <input type="hidden" name="place_label" value={loc_label} />
      <input type="hidden" name="lat" value={loc_lat} />
      <input type="hidden" name="lon" value={loc_lon} />
      <input type="hidden" name="city" value={loc_city} />
      <input type="hidden" name="region" value={loc_region} />
      <input type="hidden" name="country" value={loc_country} />
    </div>

    <!-- Home Break (optional) -->
    <div class="space-y-1.5">
      <label for="home_break" class="block text-xs font-medium text-muted-foreground">
        Home Break (optional)
      </label>
      <div class="relative">
        <input
          id="home_break"
          class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          name="homeBreakQuery"
          placeholder="Start typing... e.g. Rockaway Beach"
          value={homeBreakQuery}
          on:input={onHomeBreakInput}
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded={homeBreakSuggestions.length > 0}
          aria-controls="homebreak-suggestions"
        />

        {#if homeBreakSuggestions.length > 0}
          <ul id="homebreak-suggestions" class="mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-surface-elevated shadow-md text-sm z-20 absolute">
            {#each homeBreakSuggestions as s}
              <li>
                <button type="button" class="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface/80 transition-colors" on:click={() => chooseHomeBreakSuggestion(s)}>
                  {s.label}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <!-- Hidden fields sent to server on submit -->
      <input type="hidden" name="home_break_label" value={homeBreakLabel} />
      <input type="hidden" name="home_break_id" value={hb_id} />
      <input type="hidden" name="home_break_lat" value={hb_lat} />
      <input type="hidden" name="home_break_lon" value={hb_lon} />
    </div>

    <!-- Magic Board (optional) -->
    <div class="space-y-1.5">
      <label for="magic_board" class="block text-xs font-medium text-muted-foreground">
        Magic Board (optional)
      </label>
      <input
        id="magic_board"
        name="magic_board"
        bind:value={magicBoard}
        placeholder="Your favorite board"
        class="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        maxlength="200"
        aria-invalid={!!form?.fieldErrors?.magic_board}
        aria-errormessage="magic_board-error"
      />
      {#if form?.fieldErrors?.magic_board}
        <p id="magic_board-error" class="mt-1 text-xs text-red-400">{form.fieldErrors.magic_board}</p>
      {/if}
    </div>

    {#if form?.message}
      <p class="text-sm text-red-400">{form.message}</p>
    {/if}

    <button class="inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-primary-alt transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 disabled:cursor-not-allowed" type="submit" disabled={pickingLocation || pickingHomeBreak}>
      Save
    </button>
  </form>
</section>
