<script lang="ts">
  import { page } from '$app/stores';

  export let form:
    | {
        message?: string;
        fieldErrors?: Record<string, string>;
        values?: { username?: string; redirectTo?: string };
      }
    | undefined;

  let username = form?.values?.username ?? '';
  let redirectTo =
    form?.values?.redirectTo ??
    (new URLSearchParams($page.url.search).get('redirectTo') ?? '/');

  const usernamePattern = '^[a-z0-9_]{3,20}$';

  // --- Location autocomplete state ---
  let locationQuery = '';
  let suggestions: Array<{ id: string; label: string; lat: number; lon: number; city: string; region: string; country: string }> = [];
  let picking = false;

  // Hidden fields to submit
  let loc_id = '';
  let loc_label = '';
  let loc_lat: number | '' = '';
  let loc_lon: number | '' = '';
  let loc_city = '';
  let loc_region = '';
  let loc_country = '';

  let debounceHandle: any;

  async function searchPlaces(q: string) {
    if (!q || q.length < 2) {
      suggestions = [];
      return;
    }
    const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    suggestions = data.features ?? [];
  }

  function onLocationInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    locationQuery = v;
    // clear selection if user edits text again
    loc_id = ''; loc_label = ''; loc_lat = ''; loc_lon = ''; loc_city = ''; loc_region = ''; loc_country = '';

    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => searchPlaces(locationQuery), 200);
  }

  function chooseSuggestion(s: (typeof suggestions)[number]) {
    picking = true;
    locationQuery = s.label;
    loc_id = s.id;
    loc_label = s.label;
    loc_lat = s.lat;
    loc_lon = s.lon;
    loc_city = s.city;
    loc_region = s.region;
    loc_country = s.country;
    suggestions = [];
    picking = false;
  }
</script>

<section class="max-w-md mx-auto p-6">
  <h1 class="text-2xl font-bold mb-4">Finish setup</h1>

  <form method="POST" class="space-y-4">
    <input type="hidden" name="redirectTo" value={redirectTo} />

    <!-- Username -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Username</span></div>
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

    <!-- Location -->
    <label class="form-control w-full">
      <div class="label"><span class="label-text">Location (city / neighborhood)</span></div>
      <input
        class="input input-bordered w-full"
        name="locationQuery"
        placeholder="Start typing... e.g. Brooklyn"
        value={locationQuery}
        on:input={onLocationInput}
        autocomplete="off"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls="place-suggestions"
      />

      {#if suggestions.length > 0}
        <ul id="place-suggestions" class="menu bg-base-100 rounded-box shadow mt-2 w-full">
          {#each suggestions as s}
            <li>
              <button type="button" class="justify-start" on:click={() => chooseSuggestion(s)}>
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

    {#if form?.message}
      <p class="text-sm">{form.message}</p>
    {/if}

    <button class="btn btn-primary w-full" type="submit" disabled={picking}>Save</button>
  </form>
</section>
