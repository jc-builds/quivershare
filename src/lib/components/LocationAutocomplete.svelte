<script lang="ts">
  import type { StructuredLocation } from '$lib/types/location';
  import { createEventDispatcher } from 'svelte';

  export let value: StructuredLocation | null = null;
  export let required = false;
  export let placeholder = 'Start typing... e.g. San Diego, CA';
  export let label = 'Location';
  export let id = 'location';
  export let clearable = true;

  const dispatch = createEventDispatcher<{ change: StructuredLocation | null }>();

  let query = value?.label ?? '';
  let suggestions: StructuredLocation[] = [];
  let debounceHandle: ReturnType<typeof setTimeout>;

  $: if (value && !query) {
    query = value.label;
  }

  async function fetchSuggestions(q: string) {
    if (!q || q.length < 2) {
      suggestions = [];
      return;
    }
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      suggestions = (data.features ?? []) as StructuredLocation[];
    } catch {
      suggestions = [];
    }
  }

  function onInput(e: Event) {
    const v = (e.target as HTMLInputElement).value;
    query = v;

    if (value !== null) {
      value = null;
      dispatch('change', null);
    }

    if (!v || v.trim() === '') {
      suggestions = [];
      clearTimeout(debounceHandle);
      return;
    }

    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => fetchSuggestions(query), 200);
  }

  function select(s: StructuredLocation) {
    query = s.label;
    value = s;
    suggestions = [];
    dispatch('change', value);
  }

  function clear() {
    query = '';
    value = null;
    suggestions = [];
    dispatch('change', null);
  }
</script>

<div class="space-y-1">
  {#if label}
    <label for={id} class="block text-sm font-medium text-muted-foreground">
      {label}{#if required}<span class="text-red-400"> *</span>{/if}
    </label>
  {/if}
  <div class="relative">
    <input
      {id}
      type="text"
      class="w-full rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition"
      {placeholder}
      value={query}
      on:input={onInput}
      autocomplete="off"
      aria-autocomplete="list"
      aria-controls="{id}-suggestions"
      aria-expanded={suggestions.length > 0}
    />
    {#if suggestions.length > 0}
      <ul
        id="{id}-suggestions"
        class="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-surface-elevated border border-border rounded-lg shadow-lg text-sm"
      >
        {#each suggestions as s}
          <li>
            <button
              type="button"
              class="w-full text-left px-3 py-2 hover:bg-surface transition-colors text-foreground"
              on:click={() => select(s)}
            >
              {s.label}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
  {#if value}
    <div class="flex items-center justify-between mt-1">
      <p class="text-xs text-muted-foreground">
        Selected: {value.label}
      </p>
      {#if clearable}
        <button
          type="button"
          class="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          on:click={clear}
        >
          Clear
        </button>
      {/if}
    </div>
  {/if}

  <input type="hidden" name="location_label" value={value?.label ?? ''} />
  <input type="hidden" name="location_city" value={value?.city ?? ''} />
  <input type="hidden" name="location_region" value={value?.region ?? ''} />
  <input type="hidden" name="location_country" value={value?.country ?? ''} />
  <input type="hidden" name="location_lat" value={value?.lat ?? ''} />
  <input type="hidden" name="location_lon" value={value?.lon ?? ''} />
</div>
