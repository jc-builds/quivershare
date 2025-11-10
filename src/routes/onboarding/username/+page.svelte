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

<section class="max-w-md mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">Finish setup</h1>

  <form method="POST" enctype="multipart/form-data" class="space-y-4">
    <input type="hidden" name="redirectTo" value={redirectTo} />

    <!-- Username (required) -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Username <span class="text-error">*</span></span></div>
      <input
        name="username"
        bind:value={username}
        placeholder="3–20 chars: a–z 0–9 _"
        class="input input-bordered w-full"
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
        <div id="username-error" class="text-error text-sm mt-1">{form.fieldErrors.username}</div>
      {/if}
    </label>

    <!-- Full Name (optional) -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Full Name (optional)</span></div>
      <input
        name="full_name"
        bind:value={fullName}
        placeholder="Your full name"
        class="input input-bordered w-full"
        maxlength="100"
        autocomplete="name"
        aria-invalid={!!form?.fieldErrors?.full_name}
        aria-errormessage="full_name-error"
      />
      {#if form?.fieldErrors?.full_name}
        <div id="full_name-error" class="text-error text-sm mt-1">{form.fieldErrors.full_name}</div>
      {/if}
    </label>

    <!-- Profile Picture (optional) -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Profile Picture (optional)</span></div>
      <div class="flex items-center gap-4">
        <div class="avatar">
          <div class="w-20 h-20 rounded-full bg-base-300">
            <img
              src={profilePicturePreview || '/default_profile_picture.jpg'}
              alt="Profile preview"
              on:error={(e) => (e.currentTarget.src = '/default_profile_picture.jpg')}
            />
          </div>
        </div>
        <div class="flex-1">
          <input
            type="file"
            name="profile_picture"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            on:change={handleProfilePictureSelect}
            class="file-input file-input-bordered file-input-sm w-full"
          />
          {#if profilePicturePreview && profilePicturePreview !== '/default_profile_picture.jpg'}
            <button
              type="button"
              class="btn btn-sm btn-ghost mt-2"
              on:click={removeProfilePicture}
            >
              Remove
            </button>
          {/if}
        </div>
      </div>
      {#if form?.fieldErrors?.profile_picture}
        <div class="text-error text-sm mt-1">{form.fieldErrors.profile_picture}</div>
      {/if}
    </label>

    <!-- Location (optional) -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Location (optional)</span></div>
      <input
        class="input input-bordered w-full"
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
        <ul id="location-suggestions" class="menu bg-base-100 rounded-box shadow mt-2 w-full">
          {#each locationSuggestions as s}
            <li>
              <button type="button" class="justify-start" on:click={() => chooseLocationSuggestion(s)}>
                {s.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Hidden fields sent to server on submit -->
      <input type="hidden" name="place_id" value={loc_id} />
      <input type="hidden" name="place_label" value={loc_label} />
      <input type="hidden" name="lat" value={loc_lat} />
      <input type="hidden" name="lon" value={loc_lon} />
      <input type="hidden" name="city" value={loc_city} />
      <input type="hidden" name="region" value={loc_region} />
      <input type="hidden" name="country" value={loc_country} />
    </label>

    <!-- Home Break (optional) -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Home Break (optional)</span></div>
      <input
        class="input input-bordered w-full"
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
        <ul id="homebreak-suggestions" class="menu bg-base-100 rounded-box shadow mt-2 w-full">
          {#each homeBreakSuggestions as s}
            <li>
              <button type="button" class="justify-start" on:click={() => chooseHomeBreakSuggestion(s)}>
                {s.label}
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- Hidden fields sent to server on submit -->
      <input type="hidden" name="home_break_label" value={homeBreakLabel} />
      <input type="hidden" name="home_break_id" value={hb_id} />
      <input type="hidden" name="home_break_lat" value={hb_lat} />
      <input type="hidden" name="home_break_lon" value={hb_lon} />
    </label>

    <!-- Magic Board (optional) -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Magic Board (optional)</span></div>
      <input
        name="magic_board"
        bind:value={magicBoard}
        placeholder="Your favorite board"
        class="input input-bordered w-full"
        maxlength="200"
        aria-invalid={!!form?.fieldErrors?.magic_board}
        aria-errormessage="magic_board-error"
      />
      {#if form?.fieldErrors?.magic_board}
        <div id="magic_board-error" class="text-error text-sm mt-1">{form.fieldErrors.magic_board}</div>
      {/if}
    </label>

    {#if form?.message}
      <p class="text-error text-sm">{form.message}</p>
    {/if}

    <button class="btn btn-primary w-full" type="submit" disabled={pickingLocation || pickingHomeBreak}>
      Save
    </button>
  </form>
</section>
